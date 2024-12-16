import mongoose from 'mongoose'
import config from '@src/config.js'
import FixedSizeMap from 'fixedsize-map'
import { IMemberStats, IMemberStatsDocument } from '@root/src/types'

// Create cache with proper typing
const cache = new FixedSizeMap<string, IMemberStatsDocument>(
  config.CACHE_SIZE.MEMBERS
)

const ReqString = {
  type: String,
  required: true
} as const

const Schema = new mongoose.Schema<IMemberStatsDocument>(
  {
    guild_id: ReqString,
    member_id: ReqString,
    messages: { type: Number, default: 0 },
    voice: {
      connections: { type: Number, default: 0 },
      time: { type: Number, default: 0 }
    },
    commands: {
      slash: { type: Number, default: 0 }
    },
    contexts: {
      message: { type: Number, default: 0 },
      user: { type: Number, default: 0 }
    },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 }
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
)

const Model = mongoose.model<IMemberStatsDocument>('member-stats', Schema)

export const getMemberStats = async (
  guildId: string,
  memberId: string
): Promise<IMemberStatsDocument> => {
  const key = `${guildId}|${memberId}`
  if (cache.contains(key)) return cache.get(key)!

  let member = await Model.findOne({ guild_id: guildId, member_id: memberId })
  if (!member) {
    member = new Model({
      guild_id: guildId,
      member_id: memberId
    })
  }

  cache.add(key, member)
  return member
}

export const getXpLb = async (
  guildId: string,
  limit: number = 10
): Promise<IMemberStats[]> =>
  Model.find({
    guild_id: guildId
  })
    .limit(limit)
    .sort({ level: -1, xp: -1 })
    .lean()
