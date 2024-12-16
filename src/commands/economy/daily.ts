import { EmbedBuilder } from 'discord.js'
import { getUser } from '@schemas/User'
import { EMBED_COLORS, ECONOMY } from '@src/config.js'
const { diffHours, getRemainingTime } from '@helpers/Utils'

/**
 * @type {import("@structures/Command")}
 */
export default {
  name: 'daily',
  description: 'receive a daily bonus',
  category: 'ECONOMY',
  botPermissions: ['EmbedLinks'],

  slashCommand: {
    enabled: ECONOMY.ENABLED
  },

  async interactionRun(interaction) {
    const response = await daily(interaction.user)
    await interaction.followUp(response)
  }
}

async function daily(user) {
  const userDb = await getUser(user)
  let streak = 0

  if (userDb.daily.timestamp) {
    const lastUpdated = new Date(userDb.daily.timestamp)
    const difference = diffHours(new Date(), lastUpdated)
    if (difference < 24) {
      const nextUsage = lastUpdated.setHours(lastUpdated.getHours() + 24)
      return `You can again run this command in \`${getRemainingTime(nextUsage)}\``
    }
    streak = userDb.daily.streak || streak
    if (difference < 48) streak += 1
    else streak = 0
  }

  userDb.daily.streak = streak
  userDb.coins += ECONOMY.DAILY_COINS
  userDb.daily.timestamp = new Date()
  await userDb.save()

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.BOT_EMBED)
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
    .setDescription(
      `You got ${ECONOMY.DAILY_COINS}${ECONOMY.CURRENCY} as your daily reward\n` +
        `**Updated Balance:** ${userDb.coins}${ECONOMY.CURRENCY}`
    )

  return { embeds: [embed] }
}
