import {
  Client,
  ClientOptions,
  Collection,
  GatewayIntentBits,
  Partials,
  WebhookClient,
  ApplicationCommandType,
  ApplicationCommandDataResolvable,
  User,
  InviteGenerationOptions,
  OAuth2Scopes,
  PermissionsBitField
} from 'discord.js'
import path from 'path'
import { table } from 'table'
import config from '../config'
import Logger from '../helpers/Logger'
import { validateCommand, validateContext } from '../helpers/Validator'
import { schemas } from '@src/database/mongoose'
import Manager from '../handlers/manager'
import giveawaysHandler from '../handlers/giveaway'
import { DiscordTogether } from 'discord-together'
import { promisify } from 'util'
import { recursiveReadDirSync } from '../helpers/Utils'
import CommandCategory from './CommandCategory'

// Constants
const MAX_SLASH_COMMANDS = 100
const MAX_USER_CONTEXTS = 3
const MAX_MESSAGE_CONTEXTS = 3

export class BotClient extends Client {
  public readonly wait: (ms: number) => Promise<void>
  public readonly config: any
  public readonly slashCommands: Collection<string, any>
  public readonly contextMenus: Collection<string, any>
  public readonly counterUpdateQueue: any[]
  public readonly joinLeaveWebhook?: WebhookClient
  public readonly musicManager?: any
  public readonly giveawaysManager?: any
  public readonly logger: any
  public readonly database: any
  public readonly utils: any
  public discordTogether: DiscordTogether<{ [key: string]: string }>

  constructor() {
    const clientOptions: ClientOptions = {
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
      ],
      partials: [Partials.User, Partials.Message, Partials.Reaction],
      allowedMentions: { repliedUser: false },
      rest: {
        timeout: 20000
      }
    }

    super(clientOptions)

    // Initialize properties
    this.wait = promisify(setTimeout)
    this.config = config
    this.slashCommands = new Collection()
    this.contextMenus = new Collection()
    this.counterUpdateQueue = []

    // Initialize webhook if URL is provided
    this.joinLeaveWebhook = process.env.LOGS_WEBHOOK
      ? new WebhookClient({ url: process.env.LOGS_WEBHOOK })
      : undefined

    // Initialize optional managers
    if (this.config.MUSIC?.ENABLED) {
      this.musicManager = new Manager(this)
    }

    if (this.config.GIVEAWAYS?.ENABLED) {
      this.giveawaysManager = giveawaysHandler(this)
    }

    // Initialize utilities
    this.logger = Logger
    this.database = schemas
    this.discordTogether = new DiscordTogether(this)
  }

  public loadEvents(directory: string): void {
    this.logger.log('Loading events...')
    const clientEvents: [string, string][] = []
    let success = 0
    let failed = 0

    recursiveReadDirSync(directory).forEach((filePath: string) => {
      const file = path.basename(filePath)
      try {
        const eventName = path.basename(file, '.ts')
        const event = require(filePath)

        this.on(eventName, event.bind(null, this))
        clientEvents.push([file, '✓'])

        delete require.cache[require.resolve(filePath)]
        success++
      } catch (ex) {
        failed++
        this.logger.error(`loadEvent - ${file}`, ex)
      }
    })

    console.log(
      table(clientEvents, {
        header: { alignment: 'center', content: 'Client Events' },
        singleLine: true,
        columns: [{ width: 25 }, { width: 5, alignment: 'center' }]
      })
    )

    this.logger.log(
      `Loaded ${success + failed} events. Success (${success}) Failed (${failed})`
    )
  }

  private loadCommand(cmd: any): void {
    if (cmd.category && CommandCategory[cmd.category]?.enabled === false) {
      this.logger.debug(
        `Skipping Command ${cmd.name}. Category ${cmd.category} is disabled`
      )
      return
    }

    if (cmd.slashCommand?.enabled) {
      if (this.slashCommands.has(cmd.name)) {
        throw new Error(`Slash Command ${cmd.name} already registered`)
      }

      if (cmd.testGuildOnly || cmd.devOnly) {
        this.slashCommands.set(cmd.name, cmd)
        return
      }

      if (!this.config.INTERACTIONS.GLOBAL) {
        this.logger.debug(
          `Skipping command ${cmd.name}. Command is global but GLOBAL=false`
        )
        return
      }

      this.slashCommands.set(cmd.name, cmd)
    } else {
      this.logger.debug(`Skipping slash command ${cmd.name}. Disabled!`)
    }
  }

  public loadCommands(directory: string): void {
    this.logger.log('Loading commands...')
    const files = recursiveReadDirSync(directory)

    for (const file of files) {
      try {
        const cmd = require(file)
        if (typeof cmd !== 'object') continue
        validateCommand(cmd)
        this.loadCommand(cmd)
      } catch (ex) {
        this.logger.error(`Failed to load ${file} Reason: ${ex.message}`)
      }
    }

    this.logger.success(`Loaded ${this.slashCommands.size} slash commands`)
    if (this.slashCommands.size > MAX_SLASH_COMMANDS) {
      throw new Error(
        `A maximum of ${MAX_SLASH_COMMANDS} slash commands can be enabled`
      )
    }
  }

  public loadContexts(directory: string): void {
    this.logger.log('Loading contexts...')
    const files = recursiveReadDirSync(directory)

    for (const file of files) {
      try {
        const ctx = require(file)
        if (typeof ctx !== 'object') continue
        validateContext(ctx)

        if (!ctx.enabled) {
          this.logger.debug(`Skipping context ${ctx.name}. Disabled!`)
          continue
        }

        if (this.contextMenus.has(ctx.name)) {
          throw new Error('Context already exists with that name')
        }

        this.contextMenus.set(ctx.name, ctx)
        this.logger.debug(`Loaded context ${ctx.name}`)
      } catch (ex) {
        this.logger.error(`Failed to load ${file} Reason: ${ex.message}`)
      }
    }

    const userContexts = this.contextMenus.filter(
      ctx => ctx.type === ApplicationCommandType.User
    ).size

    const messageContexts = this.contextMenus.filter(
      ctx => ctx.type === ApplicationCommandType.Message
    ).size

    if (userContexts > MAX_USER_CONTEXTS) {
      throw new Error(
        `A maximum of ${MAX_USER_CONTEXTS} USER contexts can be enabled`
      )
    }

    if (messageContexts > MAX_MESSAGE_CONTEXTS) {
      throw new Error(
        `A maximum of ${MAX_MESSAGE_CONTEXTS} MESSAGE contexts can be enabled`
      )
    }

    this.logger.success(`Loaded ${userContexts} USER contexts`)
    this.logger.success(`Loaded ${messageContexts} MESSAGE contexts`)
  }

  public async registerInteractions(guildId?: string): Promise<void> {
    const toRegister: ApplicationCommandDataResolvable[] = []

    if (this.config.INTERACTIONS.SLASH) {
      this.slashCommands.forEach(cmd => {
        toRegister.push({
          name: cmd.name,
          description: cmd.description,
          type: ApplicationCommandType.ChatInput,
          options: cmd.slashCommand.options
        })
      })
    }

    if (this.config.INTERACTIONS.CONTEXT) {
      this.contextMenus.forEach(ctx => {
        toRegister.push({
          name: ctx.name,
          type: ctx.type
        })
      })
    }

    try {
      if (!guildId) {
        await this.application?.commands.set(toRegister)
      } else {
        const guild = this.guilds.cache.get(guildId)
        if (!guild) {
          throw new Error('No matching guild')
        }
        await guild.commands.set(toRegister)
      }
      this.logger.success('Successfully registered interactions')
    } catch (error) {
      this.logger.error(
        `Failed to register interactions: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  public async resolveUsers(search: string, exact = false): Promise<User[]> {
    if (!search || typeof search !== 'string') return []
    const users: User[] = []

    const patternMatch = search.match(/(\d{17,20})/)
    if (patternMatch) {
      const id = patternMatch[1]
      const fetched = await this.users
        .fetch(id, { cache: true })
        .catch(() => undefined)
      if (fetched) {
        users.push(fetched)
        return users
      }
    }

    const matchingTags = this.users.cache.filter(user => user.tag === search)
    if (exact && matchingTags.size === 1) {
      users.push(matchingTags.first()!)
    } else {
      matchingTags.forEach(match => users.push(match))
    }

    if (!exact) {
      this.users.cache
        .filter(
          x =>
            x.username === search ||
            x.username.toLowerCase().includes(search.toLowerCase()) ||
            x.tag.toLowerCase().includes(search.toLowerCase())
        )
        .forEach(user => users.push(user))
    }

    return users
  }

  public getInvite(): string {
    const options: InviteGenerationOptions = {
      scopes: ['bot', 'applications.commands'] as OAuth2Scopes[],
      permissions: [
        'AddReactions',
        'AttachFiles',
        'BanMembers',
        'ChangeNickname',
        'Connect',
        'CreateInstantInvite',
        'DeafenMembers',
        'EmbedLinks',
        'KickMembers',
        'ManageChannels',
        'ManageGuild',
        'ManageMessages',
        'ManageNicknames',
        'ManageRoles',
        'ModerateMembers',
        'MoveMembers',
        'MuteMembers',
        'PrioritySpeaker',
        'ReadMessageHistory',
        'SendMessages',
        'SendMessagesInThreads',
        'Speak',
        'ViewChannel'
      ] as (keyof typeof PermissionsBitField.Flags)[]
    }

    return this.generateInvite(options)
  }
}
