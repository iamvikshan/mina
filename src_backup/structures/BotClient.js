// src/structures/BotClient.js
const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  WebhookClient,
  ApplicationCommandType
} = require('discord.js')
const path = require('path')
const { table } = require('table')
const Logger = require('../helpers/Logger')
const { recursiveReadDirSync } = require('../helpers/Utils')
const { validateCommand, validateContext } = require('../helpers/Validator')
const { schemas } = require('@src/database/mongoose')
const CommandCategory = require('./CommandCategory')
const Manager = require('../handlers/manager')
const giveawaysHandler = require('../handlers/giveaway')
const { DiscordTogether } = require('discord-together')

const MAX_SLASH_COMMANDS = 100
const MAX_USER_CONTEXTS = 3
const MAX_MESSAGE_CONTEXTS = 3

module.exports = class BotClient extends Client {
  constructor() {
    super({
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
      restRequestTimeout: 20000
    })

    // Promisify setTimeout for use with async/await
    this.wait = require('util').promisify(setTimeout)
    // Load configuration
    this.config = require('@src/config')

    // Initialize collections for slash commands and context menus
    this.slashCommands = new Collection()
    this.contextMenus = new Collection()
    this.counterUpdateQueue = []

    // Initialize webhook for join/leave logs if provided
    this.joinLeaveWebhook = process.env.LOGS_WEBHOOK
      ? new WebhookClient({ url: process.env.LOGS_WEBHOOK })
      : undefined

    // Music Player
    if (this.config.MUSIC.ENABLED) this.musicManager = new Manager(this)

    // Giveaways Manager
    if (this.config.GIVEAWAYS.ENABLED)
      this.giveawaysManager = giveawaysHandler(this)

    // Initialize logger, database schemas, and DiscordTogether
    this.logger = Logger

    // Database
    this.database = schemas

    // Utils
    this.utils = require('../helpers/Utils')

    this.discordTogether = new DiscordTogether(this)
  }

  // Load and register events from a directory
  loadEvents(directory) {
    this.logger.log('Loading events...')
    const clientEvents = []
    let success = 0
    let failed = 0

    // Recursively read all files in the directory
    recursiveReadDirSync(directory).forEach(filePath => {
      const file = path.basename(filePath)
      try {
        const eventName = path.basename(file, '.js')
        const event = require(filePath)

        // Bind the event to the client
        this.on(eventName, event.bind(null, this))
        clientEvents.push([file, '✓'])

        // Clear the require cache
        delete require.cache[require.resolve(filePath)]
        success += 1
      } catch (ex) {
        failed += 1
        this.logger.error(`loadEvent - ${file}`, ex)
      }
    })

    // Log the loaded events
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

  // Load and register a single command
  loadCommand(cmd) {
    // First check category
    if (cmd.category && CommandCategory[cmd.category]?.enabled === false) {
      this.logger.debug(
        `Skipping Command ${cmd.name}. Category ${cmd.category} is disabled`
      )
      return
    }

    // Check if slash command is enabled
    if (cmd.slashCommand?.enabled) {
      if (this.slashCommands.has(cmd.name)) {
        throw new Error(`Slash Command ${cmd.name} already registered`)
      }

      // Load test/dev commands regardless of GLOBAL setting
      if (cmd.testGuildOnly || cmd.devOnly) {
        this.slashCommands.set(cmd.name, cmd)
        return
      }

      // Only load regular commands if GLOBAL is true
      if (!this.config.INTERACTIONS.GLOBAL) {
        this.logger.debug(
          `Skipping command ${cmd.name}. Command is global but GLOBAL=false`
        )
        return
      }

      // If we get here, either GLOBAL=true or it's a special command
      this.slashCommands.set(cmd.name, cmd)
    } else {
      this.logger.debug(`Skipping slash command ${cmd.name}. Disabled!`)
    }
  }

  // Load and register all commands from a directory
  loadCommands(directory) {
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

  // Load and register all context menus from a directory
  loadContexts(directory) {
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
          throw new Error(`Context already exists with that name`)
        }
        this.contextMenus.set(ctx.name, ctx)
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

  // Register interactions (slash commands and context menus) with Discord
  async registerInteractions(guildId) {
    const toRegister = []

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
        await this.application.commands.set(toRegister)
      } else if (typeof guildId === 'string') {
        const guild = this.guilds.cache.get(guildId)
        if (!guild) {
          throw new Error('No matching guild')
        }
        await guild.commands.set(toRegister)
      } else {
        throw new Error(
          'Did you provide a valid guildId to register interactions'
        )
      }
      this.logger.success('Successfully registered interactions')
    } catch (error) {
      this.logger.error(`Failed to register interactions: ${error.message}`)
    }
  }

  // Resolve users based on a search string
  async resolveUsers(search, exact = false) {
    if (!search || typeof search !== 'string') return []
    const users = []

    const patternMatch = search.match(/(\d{17,20})/)
    if (patternMatch) {
      const id = patternMatch[1]
      const fetched = await this.users
        .fetch(id, { cache: true })
        .catch(() => {})
      if (fetched) {
        users.push(fetched)
        return users
      }
    }

    const matchingTags = this.users.cache.filter(user => user.tag === search)
    if (exact && matchingTags.size === 1) {
      users.push(matchingTags.first())
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

  // Generate an invite link for the bot with specific permissions
  getInvite() {
    return this.generateInvite({
      scopes: ['bot', 'applications.commands'],
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
      ]
    })
  }
}
