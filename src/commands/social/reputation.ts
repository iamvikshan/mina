import { getUser } from '@schemas/User'
import { EmbedBuilder, ApplicationCommandOptionType } from 'discord.js'
const { diffHours, getRemainingTime } from '@helpers/Utils'
import { EMBED_COLORS } from '@src/config'

/**
 * @type {import("@structures/Command")}
 */
export default {
  name: 'rep',
  description: 'give reputation to a user',
  category: 'UTILITY',
  botPermissions: ['EmbedLinks'],

  slashCommand: {
    enabled: true,
    options: [
      {
        name: 'view',
        description: 'view reputation for a user',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'user',
            description: 'the user to check reputation for',
            type: ApplicationCommandOptionType.User,
            required: false
          }
        ]
      },
      {
        name: 'give',
        description: 'give reputation to a user',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'user',
            description: 'the user to check reputation for',
            type: ApplicationCommandOptionType.User,
            required: true
          }
        ]
      }
    ]
  },

  async interactionRun(interaction) {
    const sub = interaction.options.getSubcommand()
    let response

    // status
    if (sub === 'view') {
      const target = interaction.options.getUser('user') || interaction.user
      response = await viewReputation(target)
    }

    // give
    if (sub === 'give') {
      const target = interaction.options.getUser('user')
      response = await giveReputation(interaction.user, target)
    }

    await interaction.followUp(response)
  }
}

async function viewReputation(target) {
  const userData = await getUser(target)
  if (!userData) return `${target.username} has no reputation yet`

  const embed = new EmbedBuilder()
    .setAuthor({ name: `Reputation for ${target.username}` })
    .setColor(EMBED_COLORS.BOT_EMBED)
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      {
        name: 'Given',
        value: userData.reputation?.given.toString(),
        inline: true
      },
      {
        name: 'Received',
        value: userData.reputation?.received.toString(),
        inline: true
      }
    )

  return { embeds: [embed] }
}

async function giveReputation(user, target) {
  if (target.bot) return 'You cannot give reputation to bots'
  if (target.id === user.id) return 'You cannot give reputation to yourself'

  const userData = await getUser(user)
  if (userData && userData.reputation.timestamp) {
    const lastRep = new Date(userData.reputation.timestamp)
    const diff = diffHours(new Date(), lastRep)
    if (diff < 24) {
      const nextUsage = lastRep.setHours(lastRep.getHours() + 24)
      return `You can again run this command in \`${getRemainingTime(nextUsage)}\``
    }
  }

  const targetData = await getUser(target)

  userData.reputation.given += 1
  userData.reputation.timestamp = new Date()
  targetData.reputation.received += 1

  await userData.save()
  await targetData.save()

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.BOT_EMBED)
    .setDescription(`${target.toString()} +1 Rep!`)
    .setFooter({ text: `By ${user.username}` })
    .setTimestamp(Date.now())

  return { embeds: [embed] }
}
