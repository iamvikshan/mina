import {
  ApplicationCommandOptionData,
  ChatInputCommandInteraction,
  PermissionResolvable
} from 'discord.js'

export interface Validation {
  callback: () => boolean | Promise<boolean>
  message: string
}

export const CommandCategories = {
  ADMIN: 'ADMIN',
  ANIME: 'ANIME',
  AUTOMOD: 'AUTOMOD',
  ECONOMY: 'ECONOMY',
  FUN: 'FUN',
  IMAGE: 'IMAGE',
  INFORMATION: 'INFORMATION',
  INVITE: 'INVITE',
  MODERATION: 'MODERATION',
  ERELA_JS: 'ERELA_JS',
  NONE: 'NONE',
  DEV: 'DEV',
  SOCIAL: 'SOCIAL',
  SUGGESTION: 'SUGGESTION',
  TICKET: 'TICKET',
  UTILITY: 'UTILITY'
} as const

export type CommandCategory = keyof typeof CommandCategories

export interface InteractionInfo {
  enabled: boolean
  ephemeral: boolean
  options: ApplicationCommandOptionData[]
}

export interface CommandData {
  name: string
  description: string
  cooldown: number
  isPremium?: boolean
  testGuildOnly?: boolean
  devOnly?: boolean
  category: CommandCategory
  botPermissions?: PermissionResolvable[]
  userPermissions?: PermissionResolvable[]
  validations?: Validation[]
  slashCommand: InteractionInfo
  interactionRun: (
    interaction: ChatInputCommandInteraction,
    data: object
  ) => Promise<void> | void
}

export const BaseCommand: CommandData = {
  name: '',
  description: '',
  cooldown: 0,
  isPremium: false,
  category: 'NONE',
  botPermissions: [],
  userPermissions: [],
  validations: [],
  slashCommand: {
    enabled: true,
    ephemeral: false,
    options: []
  },
  interactionRun: async (
    _interaction: ChatInputCommandInteraction,
    _data: object
  ) => {}
}
