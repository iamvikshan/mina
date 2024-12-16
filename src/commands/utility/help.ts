import { EMBED_COLORS } from '@src/config.js'
import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ApplicationCommandOptionType,
  ButtonStyle
} from 'discord.js'
import { getSlashUsage } from '@handlers/command'
import CommandCategory from '@root/src/structures/CommandCategory'

const CMDS_PER_PAGE = 5
const IDLE_TIMEOUT = 900 // 15 minutes

export default {
  name: 'help',
  description: 'command help menu',
  category: 'UTILITY',
  botPermissions: ['EmbedLinks'],
  slashCommand: {
    enabled: true,
    options: [
      {
        name: 'command',
        description: 'name of the command',
        required: false,
        type: ApplicationCommandOptionType.String
      }
    ]
  },

  interactionRun: async interaction => {
    const cmdName = interaction.options.getString('command')

    if (!cmdName) {
      const response = await getHelpMenu(interaction)
      const sentMsg = await interaction.followUp(response)
      return waiter(sentMsg, interaction.member)
    }

    const cmd = interaction.client.slashCommands.get(cmdName)
    if (cmd) {
      const embed = getSlashUsage(cmd)
      return interaction.followUp({ embeds: [embed] })
    }

    await interaction.followUp('No matching command found')
  }
}

const getHelpMenu = async ({ client, guild, member }) => {
  const options = Object.entries(CommandCategory)
    .filter(([_, v]) => {
      if (!v.enabled) return false
      if (
        (v.name.includes('Moderation') ||
          v.name.includes('Admin') ||
          v.name.includes('Automod') ||
          v.name.includes('Ticket') ||
          v.name.includes('Giveaway')) &&
        !member.permissions.has('ManageGuild')
      ) {
        return false
      }
      if (
        v.name === 'Developer' &&
        !process.env.DEV_ID.split(',').includes(member.user.id)
      )
        return false
      return true
    })
    .map(([k, v]) => ({
      label: v.name,
      value: k,
      description: `View commands in ${v.name} category`,
      emoji: v.emoji
    }))

  const menuRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help-menu')
      .setPlaceholder('Choose the command category')
      .addOptions(options)
  )

  const components = [
    new ButtonBuilder()
      .setCustomId('previousBtn')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('nextBtn')
      .setEmoji('➡️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  ]

  const buttonsRow = new ActionRowBuilder().addComponents(components)

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.BOT_EMBED)
    .setThumbnail(client.user.displayAvatarURL())
    .setDescription(
      `**About Me:**\n` +
        `Hello I am ${guild.members.me.displayName}!\n` +
        'A cool multipurpose discord bot which can serve all your needs\n\n' +
        `**Invite Me:** [Here](${client.getInvite()})\n` +
        `**Support Server:** [Join](${process.env.SUPPORT_SERVER})`
    )

  return {
    embeds: [embed],
    components: [menuRow, buttonsRow]
  }
}

const waiter = (msg, member) => {
  const collector = msg.channel.createMessageComponentCollector({
    filter: reactor =>
      reactor.user.id === member.id && msg.id === reactor.message.id,
    idle: IDLE_TIMEOUT * 1000,
    dispose: true,
    time: 5 * 60 * 1000
  })

  let arrEmbeds = []
  let currentPage = 0
  let menuRow = msg.components[0]
  let buttonsRow = msg.components[1]

  collector.on('collect', async response => {
    if (!['help-menu', 'previousBtn', 'nextBtn'].includes(response.customId))
      return
    await response.deferUpdate()

    switch (response.customId) {
      case 'help-menu': {
        const cat = response.values[0].toUpperCase()
        arrEmbeds = getSlashCategoryEmbeds(msg.client, cat, member)
        currentPage = 0

        const components = buttonsRow.components.map(button =>
          ButtonBuilder.from(button).setDisabled(arrEmbeds.length <= 1)
        )

        buttonsRow = new ActionRowBuilder().addComponents(components)
        msg.editable &&
          (await msg.edit({
            embeds: [arrEmbeds[currentPage]],
            components: [menuRow, buttonsRow]
          }))
        break
      }

      case 'previousBtn':
        if (currentPage !== 0) {
          --currentPage
          msg.editable &&
            (await msg.edit({
              embeds: [arrEmbeds[currentPage]],
              components: [menuRow, buttonsRow]
            }))
        }
        break

      case 'nextBtn':
        if (currentPage < arrEmbeds.length - 1) {
          currentPage++
          msg.editable &&
            (await msg.edit({
              embeds: [arrEmbeds[currentPage]],
              components: [menuRow, buttonsRow]
            }))
        }
        break
    }
  })

  collector.on('end', () => {
    if (!msg.guild || !msg.channel) return
    return msg.editable && msg.edit({ components: [] })
  })
}

const getSlashCategoryEmbeds = (client, category, member) => {
  if (category === 'IMAGE') {
    const collector = client.slashCommands
      .filter(cmd => cmd.category === category)
      .map(cmd => `\`/${cmd.name}\`\n ❯ ${cmd.description}\n\n`)
      .join('')

    const availableFilters = client.slashCommands
      .get('filter')
      ?.slashCommand.options[0].choices.map(ch => ch.name)
      .join(', ')

    const availableGens = client.slashCommands
      .get('generator')
      ?.slashCommand.options[0].choices.map(ch => ch.name)
      .join(', ')

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setThumbnail(CommandCategory[category]?.image)
      .setAuthor({ name: `${category} Commands` })
      .setDescription(
        `${collector}**Available Filters:**\n${availableFilters}\n\n**Available Generators**\n${availableGens}`
      )

    return [embed]
  }

  const commands = Array.from(
    client.slashCommands.filter(cmd => cmd.category === category).values()
  )

  if (commands.length === 0) {
    return [
      new EmbedBuilder()
        .setColor(EMBED_COLORS.BOT_EMBED)
        .setThumbnail(CommandCategory[category]?.image)
        .setAuthor({ name: `${category} Commands` })
        .setDescription('No commands in this category')
    ]
  }

  return Array.from(
    { length: Math.ceil(commands.length / CMDS_PER_PAGE) },
    (_, i) => {
      const start = i * CMDS_PER_PAGE
      const end = start + CMDS_PER_PAGE

      const pageCommands = commands
        .slice(start, end)
        .filter(
          cmd =>
            !cmd.userPermissions?.some(perm => !member.permissions.has(perm))
        )
        .map(
          cmd => `\`/${cmd.name}\`\n ❯ **Description**: ${cmd.description}\n`
        )

      return new EmbedBuilder()
        .setColor(EMBED_COLORS.BOT_EMBED)
        .setThumbnail(CommandCategory[category]?.image)
        .setAuthor({ name: `${category} Commands` })
        .setDescription(pageCommands.join('\n'))
        .setFooter({
          text: `page ${i + 1} of ${Math.ceil(commands.length / CMDS_PER_PAGE)}`
        })
    }
  )
}
