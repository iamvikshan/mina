import mongoose from 'mongoose'
import { log, success, error } from '../helpers/Logger'

mongoose.set('strictQuery', true)

export default {
  async initializeMongoose() {
    log(`Connecting to MongoDb...`)

    try {
      await mongoose.connect(process.env.MONGO_URL)

      success('Mongoose: Database connection established')

      return mongoose.connection
    } catch (err) {
      error('Mongoose: Failed to connect to database', err)
      process.exit(1)
    }
  },

  schemas: {
    Giveaways: require('./schemas/Giveaways'),
    Guild: require('./schemas/Guild'),
    Member: require('./schemas/Member'),
    ReactionRoles: require('./schemas/ReactionRoles').model,
    ModLog: require('./schemas/ModLog').model,
    User: require('./schemas/User'),
    Suggestions: require('./schemas/Suggestions').model,
    TruthOrDare: require('./schemas/TruthOrDare').model,
    Dev: require('./schemas/Dev'),
  },
}

export const initializeMongoose = () => mongoose.connect(process.env.MONGO_URL)
