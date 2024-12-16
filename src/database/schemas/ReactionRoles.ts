import { Client } from 'discord.js'
import mongoose, { Document, Schema } from 'mongoose'

export interface IRole {
  emote: string
  role_id: string
}

export interface IReactionRole {
  guild_id: string
  channel_id: string
  message_id: string
  roles: IRole[]
  created_at: Date
}

export interface IReactionRoleDocument extends IReactionRole, Document {}

type CachedRoles = IRole[]

const reqString = {
  type: String,
  required: true
} as const

export const reactionRoleSchema = new Schema<IReactionRoleDocument>(
  {
    guild_id: reqString,
    channel_id: reqString,
    message_id: reqString,
    roles: [
      {
        _id: false,
        emote: reqString,
        role_id: reqString
      }
    ]
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: false
    }
  }
)

export const ReactionRoles = mongoose.model<IReactionRoleDocument>(
  'reaction-roles',
  reactionRoleSchema
)

const rrCache = new Map<string, CachedRoles>()

const getKey = (
  guildId: string,
  channelId: string,
  messageId: string
): string => `${guildId}|${channelId}|${messageId}`

export async function cacheReactionRoles(client: Client): Promise<void> {
  rrCache.clear()
  const docs = await ReactionRoles.find().lean<IReactionRole[]>()

  for (const doc of docs) {
    const guild = client.guilds.cache.get(doc.guild_id)

    if (!guild) continue
    if (!guild.channels.cache.has(doc.channel_id)) continue

    const key = getKey(doc.guild_id, doc.channel_id, doc.message_id)
    rrCache.set(key, doc.roles)
  }
}

export function getReactionRoles(
  guildId: string,
  channelId: string,
  messageId: string
): CachedRoles {
  return rrCache.get(getKey(guildId, channelId, messageId)) || []
}

export async function addReactionRole(
  guildId: string,
  channelId: string,
  messageId: string,
  emote: string,
  roleId: string
): Promise<void> {
  const filter = {
    guild_id: guildId,
    channel_id: channelId,
    message_id: messageId
  }

  await ReactionRoles.updateOne(filter, { $pull: { roles: { emote } } })

  const data = await ReactionRoles.findOneAndUpdate(
    filter,
    {
      $push: {
        roles: { emote, role_id: roleId }
      }
    },
    { upsert: true, new: true }
  ).lean<IReactionRole>()

  if (!data) {
    throw new Error('Failed to update reaction role')
  }

  const key = getKey(guildId, channelId, messageId)
  rrCache.set(key, data.roles)
}

export async function removeReactionRole(
  guildId: string,
  channelId: string,
  messageId: string
): Promise<void> {
  await ReactionRoles.deleteOne({
    guild_id: guildId,
    channel_id: channelId,
    message_id: messageId
  })

  rrCache.delete(getKey(guildId, channelId, messageId))
}
