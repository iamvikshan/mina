import { MessageReaction, User, Role } from 'discord.js'
import { getReactionRoles } from '@schemas/ReactionRoles'

interface ReactionDocument {
  emote: string
  role_id: string
}

async function getRole(reaction: MessageReaction): Promise<Role | null> {
  const { message, emoji } = reaction
  if (!message?.channel) return null

  const reactionRoles = getReactionRoles(
    message.guildId,
    message.channelId,
    message.id
  )

  const emote = emoji.id ?? emoji.toString()
  const found = reactionRoles.find(
    (doc: ReactionDocument) => doc.emote === emote
  )

  return found ? await message.guild?.roles.fetch(found.role_id) : null
}

export const handleReactionAdd = async (
  reaction: MessageReaction,
  user: User
): Promise<void> => {
  const role = await getRole(reaction)
  if (!role) return

  const member = await reaction.message.guild?.members.fetch(user.id)
  if (!member) return

  try {
    await member.roles.add(role)
  } catch (error) {
    // Handle error silently
  }
}

export const handleReactionRemove = async (
  reaction: MessageReaction,
  user: User
): Promise<void> => {
  const role = await getRole(reaction)
  if (!role) return

  const member = await reaction.message.guild?.members.fetch(user.id)
  if (!member) return

  try {
    await member.roles.remove(role)
  } catch (error) {
    // Handle error silently
  }
}

export const reactionRoleHandler = {
  handleReactionAdd,
  handleReactionRemove
}
