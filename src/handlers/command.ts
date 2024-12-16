import { EmbedBuilder, ApplicationCommandOptionType } from 'discord.js'
import { EMBED_COLORS } from '@src/config'
import { parsePermissions } from '@helpers/Utils'
import { timeformat } from '@helpers/Utils'
import { getSettings } from '@schemas/Guild'

const cooldownCache = new Map()

export const handleSlashCommand = async (interaction: any) => {
  const cmd = interaction.client.slashCommands.get(interaction.commandName)
  if (!cmd) {
    return interaction
      .reply({
        content:
          'IDK how this got here, but this command is currently disabled.',
        ephemeral: true
      })
      .catch(() => {})
  }

  // callback validations
  if (cmd.validations) {
    for (const validation of cmd.validations) {
      if (!validation.callback(interaction)) {
        return interaction.reply({
          content: validation.message,
          ephemeral: true
        })
      }
    }
  }

  // DEV commands
  if (
    cmd.category === 'DEV' &&
    !process.env.DEV_ID?.includes(interaction.user.id)
  ) {
    return interaction.reply({
      content: '💔 Oh no! Only my sweet developers can use this command~!',
      ephemeral: true
    })
  }

  // user permissions
  if (interaction.member && cmd.userPermissions?.length > 0) {
    if (!interaction.member.permissions.has(cmd.userPermissions)) {
      return interaction.reply({
        content: `💔 You need ${parsePermissions(cmd.userPermissions)} for this command, darling~!`,
        ephemeral: true
      })
    }
  }

  // bot permissions
  if (cmd.botPermissions?.length > 0) {
    if (!interaction.guild.members.me.permissions.has(cmd.botPermissions)) {
      return interaction.reply({
        content: `😳 I need ${parsePermissions(cmd.botPermissions)} for this command, please~!`,
        ephemeral: true
      })
    }
  }

  // cooldown check
  if (cmd.cooldown > 0) {
    const remaining = getRemainingCooldown(interaction.user.id, cmd)
    if (remaining > 0) {
      return interaction.reply({
        content: `⏳ You're on cooldown, dear! You can use the command again in \`${timeformat(remaining)}\`, nya~!`,
        ephemeral: true
      })
    }
  }

  try {
    if (!cmd.showsModal) {
      await interaction.deferReply({ ephemeral: cmd.slashCommand.ephemeral })
    }
    const settings = await getSettings(interaction.guild)
    await cmd.interactionRun(interaction, { settings })
  } catch (ex) {
    if (!cmd.showsModal) {
      await interaction.followUp(
        '😢 Oops! An error occurred while running the command, please try again later~!'
      )
    }
    interaction.client.logger.error('interactionRun', ex)
  } finally {
    if (cmd.cooldown > 0) applyCooldown(interaction.user.id, cmd)
  }
}

export const getSlashUsage = (cmd: any) => {
  let desc = ''
  if (
    cmd.slashCommand.options?.find(
      (o: any) => o.type === ApplicationCommandOptionType.Subcommand
    )
  ) {
    const subCmds = cmd.slashCommand.options.filter(
      (opt: any) => opt.type === ApplicationCommandOptionType.Subcommand
    )
    subCmds.forEach((sub: any) => {
      desc += `\`/${cmd.name} ${sub.name}\`\n❯ ${sub.description}\n\n`
    })
  } else {
    desc += `\`/${cmd.name}\`\n\n**Help:** ${cmd.description}`
  }

  if (cmd.cooldown) {
    desc += `\n**Cooldown:** ${timeformat(cmd.cooldown)}`
  }

  return new EmbedBuilder()
    .setColor(EMBED_COLORS.BOT_EMBED)
    .setDescription(desc)
}

export const applyCooldown = (memberId: string, cmd: any): void => {
  const key = `${cmd.name}|${memberId}`
  cooldownCache.set(key, Date.now())
}

export const getRemainingCooldown = (memberId: string, cmd: any): number => {
  const key = `${cmd.name}|${memberId}`
  if (cooldownCache.has(key)) {
    const remaining = (Date.now() - cooldownCache.get(key)) * 0.001
    if (remaining > cmd.cooldown) {
      cooldownCache.delete(key)
      return 0
    }
    return cmd.cooldown - remaining
  }
  return 0
}

export const commandHandler = {
  handleSlashCommand,
  getSlashUsage
}