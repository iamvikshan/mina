const { unTimeoutTarget } = require('@helpers/ModUtils')
const { MODERATION } = require('@src/config')
import { ApplicationCommandOptionType } from 'discord.js'

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: 'untimeout',
  description: 'remove timeout from a member',
  category: 'MODERATION',
  botPermissions: ['ModerateMembers'],
  userPermissions: ['ModerateMembers'],

  slashCommand: {
    enabled: MODERATION.ENABLED,
    options: [
      {
        name: 'user',
        description: 'the target member',
        type: ApplicationCommandOptionType.User,
        required: true
      },
      {
        name: 'reason',
        description: 'reason for timeout',
        type: ApplicationCommandOptionType.String,
        required: false
      }
    ]
  },

  async interactionRun(interaction) {
    const user = interaction.options.getUser('user')
    const reason = interaction.options.getString('reason')
    const target = await interaction.guild.members.fetch(user.id)

    const response = await untimeout(interaction.member, target, reason)
    await interaction.followUp(response)
  }
}

async function untimeout(issuer, target, reason) {
  const response = await unTimeoutTarget(issuer, target, reason)
  if (typeof response === 'boolean')
    return `Timeout of ${target.user.username} is removed!`
  if (response === 'BOT_PERM')
    return `I do not have permission to remove timeout of ${target.user.username}`
  else if (response === 'MEMBER_PERM')
    return `You do not have permission to remove timeout of ${target.user.username}`
  else if (response === 'NO_TIMEOUT')
    return `${target.user.username} is not timed out!`
  else return `Failed to remove timeout of ${target.user.username}`
}
