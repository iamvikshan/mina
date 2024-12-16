import mongoose, { Schema } from 'mongoose'
import {
  PresenceStatus,
  PresenceType,
  IDevConfigDocument,
  IPresenceConfig,
  IDevCommands,
  PresenceUpdateData
} from '@root/src/types'

// Schema definition
export const devConfigSchema = new Schema<IDevConfigDocument>(
  {
    PRESENCE: {
      ENABLED: { type: Boolean, default: true },
      STATUS: {
        type: String,
        enum: Object.values(PresenceStatus),
        default: PresenceStatus.IDLE
      },
      TYPE: {
        type: String,
        enum: Object.values(PresenceType),
        default: PresenceType.CUSTOM
      },
      MESSAGE: {
        type: String,
        default: "We'll show them. We'll show them all..."
      },
      URL: {
        type: String,
        default: 'https://twitch.tv/iamvikshan'
      }
    },
    DEV_COMMANDS: {
      ENABLED: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
)

// Model
export const Dev = mongoose.model<IDevConfigDocument>(
  'dev-config',
  devConfigSchema
)

// Individual function exports
export async function getPresenceConfig(): Promise<IDevConfigDocument> {
  const document = await Dev.findOne()
  if (!document) {
    return await Dev.create({})
  }
  return document
}

export async function updatePresenceConfig(update: {
  PRESENCE: PresenceUpdateData
}): Promise<IDevConfigDocument> {
  const document = await Dev.findOne()
  if (!document) {
    return await Dev.create(update)
  }

  for (const [key, value] of Object.entries(update.PRESENCE)) {
    ;(document.PRESENCE as any)[key as keyof IPresenceConfig] =
      value as IPresenceConfig[keyof IPresenceConfig]
  }

  return await document.save()
}

export async function getDevCommandsConfig(): Promise<IDevCommands> {
  const document = await Dev.findOne()
  if (!document) {
    return (await Dev.create({})).DEV_COMMANDS
  }
  return document.DEV_COMMANDS
}

export async function setDevCommands(enabled: boolean): Promise<IDevCommands> {
  const document = await Dev.findOne()
  if (!document) {
    return (await Dev.create({ DEV_COMMANDS: { ENABLED: enabled } }))
      .DEV_COMMANDS
  }

  document.DEV_COMMANDS.ENABLED = enabled
  await document.save()
  return document.DEV_COMMANDS
}

export { PresenceStatus, PresenceType }
