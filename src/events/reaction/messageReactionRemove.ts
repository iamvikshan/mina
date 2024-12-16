import { Client } from 'discord.js'
import { MessageReaction, PartialMessageReaction, User } from 'discord.js'
import { BotClient } from '@src/structures'
import { reactionRoleHandler } from '@src/handlers'

export const messageReactionRemove = async (
  client: BotClient,
  reaction: MessageReaction | PartialMessageReaction,
  user: User
): Promise<void> => {
  if (reaction.partial) {
    try {
      reaction = await reaction.fetch()
    } catch (error: unknown) {
      // Possibly deleted reaction
      return
    }
  }

  await reactionRoleHandler.handleReactionRemove(
    reaction as MessageReaction,
    user
  )
}

export default messageReactionRemove
