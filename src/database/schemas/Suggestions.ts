import mongoose from 'mongoose'

const suggestionSchema = new mongoose.Schema(
  {
    guild_id: String,
    channel_id: String,
    message_id: String,
    user_id: String,
    suggestion: String,
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'DELETED'],
      default: 'PENDING'
    },
    stats: {
      upvotes: { type: Number, default: 0 },
      downvotes: { type: Number, default: 0 }
    },
    status_updates: [
      {
        _id: false,
        user_id: String,
        status: {
          type: String,
          enum: ['APPROVED', 'REJECTED', 'DELETED']
        },
        reason: String,
        timestamp: { type: Date, default: new Date() }
      }
    ]
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
)

const SuggestionModel = mongoose.model('suggestions', suggestionSchema)

export const addSuggestion = async (message, userId, suggestion) => {
  return new SuggestionModel({
    guild_id: message.guildId,
    channel_id: message.channelId,
    message_id: message.id,
    user_id: userId,
    suggestion: suggestion
  }).save()
}

export const findSuggestion = async (guildId, messageId) => {
  return SuggestionModel.findOne({ guild_id: guildId, message_id: messageId })
}

export const deleteSuggestionDb = async (
  guildId,
  messageId,
  memberId,
  reason
) => {
  return SuggestionModel.updateOne(
    { guild_id: guildId, message_id: messageId },
    {
      status: 'DELETED',
      $push: {
        status_updates: { user_id: memberId, status: 'DELETED', reason }
      }
    }
  )
}

export const model = SuggestionModel
