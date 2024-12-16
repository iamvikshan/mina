// types/moderation.ts

import { GuildChannel, VoiceChannel, StageChannel } from 'discord.js'

export enum ModerationType {
  PURGE = 'PURGE',
  TIMEOUT = 'TIMEOUT',
  UNTIMEOUT = 'UNTIMEOUT',
  KICK = 'KICK',
  SOFTBAN = 'SOFTBAN',
  BAN = 'BAN',
  UNBAN = 'UNBAN',
  VMUTE = 'VMUTE',
  VUNMUTE = 'VUNMUTE',
  DEAFEN = 'DEAFEN',
  UNDEAFEN = 'UNDEAFEN',
  DISCONNECT = 'DISCONNECT',
  MOVE = 'MOVE',
  WARN = 'WARN'
}

export type PurgeType = 'ATTACHMENT' | 'BOT' | 'LINK' | 'TOKEN' | 'USER' | 'ALL'

export type ModBaseResponse =
  | true
  | 'MEMBER_PERM'
  | 'BOT_PERM'
  | 'NO_VOICE'
  | 'ERROR'

export type VoiceMuteResponse = ModBaseResponse | 'ALREADY_MUTED' | 'NOT_MUTED'
export type DeafenResponse =
  | ModBaseResponse
  | 'ALREADY_DEAFENED'
  | 'NOT_DEAFENED'
export type MoveResponse =
  | ModBaseResponse
  | 'ALREADY_IN_CHANNEL'
  | 'TARGET_PERM'
export type PurgeResponse =
  | number
  | ModBaseResponse
  | 'INVALID_AMOUNT'
  | 'NO_MESSAGES'

export interface ModLogData {
  purgeType?: PurgeType
  deletedCount?: number
  channel?: GuildChannel | VoiceChannel | StageChannel
  duration?: number
  reason?: string
}

// src/handlers/automod.ts
export interface AutomodSettings {
  logs_channel?: string
  automod?: {
    debug: boolean
    wh_channels: string[]
    max_mentions: number
    max_role_mentions: number
    anti_massmention: number
    max_lines: number
    anti_attachments: boolean
    anti_links: boolean
    anti_spam: boolean
    anti_invites: boolean
    strikes: number
    action:
      | ModerationType.TIMEOUT
      | ModerationType.KICK
      | ModerationType.SOFTBAN
      | ModerationType.BAN
  }
}

export interface AntispamInfo {
  channelId: string
  content: string
  timestamp: number
}
