import mongoose, { Document } from 'mongoose'
import { GuildMember, User } from 'discord.js'

// Pronoun-related types
export type PronounSet = 'he' | 'she' | 'they' | 'it' | 'any' | 'ask' | 'avoid'

// User Flag Type
export interface UserFlag {
  reason: string
  flaggedBy: string
  flaggedAt: Date
  serverId: string
  serverName: string
}

// User Metadata Consolidation
export interface UserMetadata {
  reputation: {
    received: number
    given: number
    timestamp?: Date
  }
  daily: {
    streak: number
    timestamp?: Date
  }
  premium: {
    enabled: boolean
    expiresAt: Date | null
  }
}

// AFK Status Type
export interface UserAfk {
  enabled: boolean
  reason: string | null
  since: Date | null
  endTime: Date | null
}

// Profile Privacy Controls
export interface ProfilePrivacy {
  showAge: boolean
  showRegion: boolean
  showBirthdate: boolean
  showPronouns: boolean
}

// Comprehensive User Profile
export interface UserProfile {
  pronouns: string | null
  birthdate: Date | null
  age: number | null
  region: string | null
  languages: string[]
  timezone: string | null
  bio: string | null
  interests: string[]
  socials: Map<string, string>
  favorites: Map<string, string>
  goals: string[]
  privacy: ProfilePrivacy
  lastUpdated: Date
  createdAt: Date
}

// Main User Settings Interface
export interface UserSettings extends Document {
  _id: string
  username: string
  discriminator: string
  logged: boolean
  coins: number
  bank: number
  metadata: UserMetadata
  flags: UserFlag[]
  afk: UserAfk
  profile: UserProfile
  created_at?: Date
  updated_at?: Date
}

// Invite-related Types
export interface InviteData {
  inviter?: string
  tracked?: number
  fake?: number
  left?: number
  added?: number
  code: string
  uses: number
  maxUses: number
  inviterId: string
  deletedTimestamp?: number
}

export interface IMember extends Document {
  guild_id: string
  member_id: string
  strikes: number
  warnings: number
  invite_data: InviteData
  created_at: Date
  updated_at: Date
}

export interface InviteRank {
  _id: string
  invites: number
}

// Function Types
export type GetUser = (user: User | GuildMember) => Promise<UserSettings>
export type AddFlag = (
  userId: string,
  reason: string,
  flaggedBy: string,
  serverId: string,
  serverName: string
) => Promise<UserSettings>
export type RemoveFlag = (
  userId: string,
  flaggedBy: string
) => Promise<UserSettings>
export type RemoveAllFlags = (userId: string) => Promise<UserSettings>
export type UpdatePremium = (
  userId: string,
  enabled: boolean,
  expiresAt: Date | null
) => Promise<UserSettings>
export type SetAfk = (
  userId: string,
  reason?: string | null,
  duration?: number | null
) => Promise<UserSettings>
export type RemoveAfk = (userId: string) => Promise<UserSettings>
export type UpdateProfile = (
  userId: string,
  profileData: Partial<Omit<UserProfile, 'lastUpdated' | 'createdAt'>>
) => Promise<UserSettings>
export type ClearProfile = (userId: string) => Promise<UserSettings>
export type GetUsersWithBirthdayToday = () => Promise<UserSettings[]>

// Define interfaces for the schema structure
export interface IVoiceStats {
  connections: number
  time: number
}

export interface ICommandStats {
  slash: number
}

export interface IContextStats {
  message: number
  user: number
}

export interface IMemberStats {
  guild_id: string
  member_id: string
  messages: number
  voice: IVoiceStats
  commands: ICommandStats
  contexts: IContextStats
  xp: number
  level: number
  created_at: Date
  updated_at: Date
}

// Define the document type that extends the base export interface and mongoose.Document
export interface IMemberStatsDocument extends IMemberStats, mongoose.Document {}
