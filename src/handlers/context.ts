import { parsePermissions, timeformat } from '@helpers/Utils'

const cooldownCache = new Map()

const getRemainingCooldown = (memberId, context) => {
  const key = `${context.name}|${memberId}`
  if (cooldownCache.has(key)) {
    const remaining = (Date.now() - cooldownCache.get(key)) * 0.001
    if (remaining > context.cooldown) {
      cooldownCache.delete(key)
      return 0
    }
    return context.cooldown - remaining
  }
  return 0
}

const applyCooldown = (memberId, context) => {
  const key = `${context.name}|${memberId}`
  cooldownCache.set(key, Date.now())
}

const handleContext = async (interaction, context) => {
  if (context.cooldown) {
    const remaining = getRemainingCooldown(interaction.user.id, context)
    if (remaining > 0) {
      return interaction.reply({
        content: `You are on cooldown. You can again use the command after ${timeformat(remaining)}`,
        ephemeral: true
      })
    }
  }

  if (interaction.member && context.userPermissions?.length > 0) {
    if (!interaction.member.permissions.has(context.userPermissions)) {
      return interaction.reply({
        content: `You need ${parsePermissions(context.userPermissions)} for this command`,
        ephemeral: true
      })
    }
  }

  try {
    await interaction.deferReply({ ephemeral: context.ephemeral })
    await context.run(interaction)
  } catch (ex) {
    interaction.followUp('Oops! An error occurred while running the command')
    interaction.client.logger.error('contextRun', ex)
  } finally {
    applyCooldown(interaction.user.id, context)
  }
}

export const contextHandler = {
  handleContext
}