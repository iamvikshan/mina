// Enums for better type safety
export enum PresenceStatus {
  ONLINE = 'online',
  IDLE = 'idle',
  DND = 'dnd',
  INVISIBLE = 'invisible'
}

export enum PresenceType {
  COMPETING = 'COMPETING',
  LISTENING = 'LISTENING',
  PLAYING = 'PLAYING',
  WATCHING = 'WATCHING',
  STREAMING = 'STREAMING',
  CUSTOM = 'CUSTOM'
}

// Interfaces
export interface IPresenceConfig {
  ENABLED: boolean
  STATUS: PresenceStatus
  TYPE: PresenceType
  MESSAGE: string
  URL: string
}

export interface IDevCommands {
  ENABLED: boolean
}

export interface IDevConfig {
  PRESENCE: IPresenceConfig
  DEV_COMMANDS: IDevCommands
}

// Interface for the Document with timestamps
export interface IDevConfigDocument extends IDevConfig, Document {
  createdAt: Date
  updatedAt: Date
}

// Type for partial presence updates
export type PresenceUpdateData = Partial<IPresenceConfig>
