import { ApplicationCommandType } from 'discord.js'
import CommandCategory from '@structures/CommandCategory'
import permissions from './permissions'
import config from '@src/config'
import { log, warn, error } from './Logger'

export class Validator {
  static validateConfiguration() {
    log('Validating config file and environment variables')

    // Essential Checks
    const requiredEnvVars = {
      BOT_TOKEN: process.env.BOT_TOKEN,
      MONGO_URL: process.env.MONGO_URL,
      LOGS_WEBHOOK: process.env.LOGS_WEBHOOK
    }

    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        error(`env: ${key} cannot be empty`)
        process.exit(1)
      }
    }

    // Dashboard Validation
    if (config.DASHBOARD.enabled) {
      const requiredDashboardVars = {
        CLIENT_SECRET: process.env.CLIENT_SECRET,
        SESSION_PASSWORD: process.env.SESSION_PASSWORD,
        BASE_URL: process.env.BASE_URL,
        FAILURE_URL: process.env.FAILURE_URL
      }

      for (const [key, value] of Object.entries(requiredDashboardVars)) {
        if (!value) {
          error(
            `${key.includes('URL') ? 'config.ts' : 'env'}: ${key} cannot be empty`
          )
          process.exit(1)
        }
      }

      if (!config.DASHBOARD.port) {
        error('config.ts: DASHBOARD port cannot be empty')
        process.exit(1)
      }
    }

    // Cache Size Validation
    const cacheSizes = [
      config.CACHE_SIZE.GUILDS,
      config.CACHE_SIZE.USERS,
      config.CACHE_SIZE.MEMBERS
    ]

    if (cacheSizes.some(size => isNaN(size))) {
      error('config.ts: CACHE_SIZE must be a positive integer')
      process.exit(1)
    }

    // Music Configuration
    if (config.MUSIC.ENABLED) {
      if (!config.MUSIC.LAVALINK_NODES.length) {
        warn('config.ts: There must be at least one node for Lavalink')
      }

      const validSources = [
        'ytsearch',
        'ytmsearch',
        'scsearch',
        'spsearch',
        'dzsearch',
        'jssearch'
      ]

      if (!validSources.includes(config.MUSIC.DEFAULT_SOURCE)) {
        warn(
          'config.ts: MUSIC.DEFAULT_SOURCE must be either ytsearch, ytmsearch, scsearch, spsearch, dzsearch or jssearch'
        )
      }
    }

    // Optional Configurations Warning
    if (!process.env.DEV_ID?.length) warn('config.ts: DEV_ID(s) are empty')
    if (!process.env.SUPPORT_SERVER)
      warn('config.ts: SUPPORT_SERVER is not provided')
  }

  static validateCommand(cmd) {
    if (!cmd || typeof cmd !== 'object') {
      throw new TypeError('Command data must be an Object.')
    }

    const validations = [
      {
        check: () =>
          typeof cmd.name === 'string' && cmd.name === cmd.name.toLowerCase(),
        error: 'Command name must be a lowercase string.'
      },
      {
        check: () => typeof cmd.description === 'string',
        error: 'Command description must be a string.'
      },
      {
        check: () => !cmd.cooldown || typeof cmd.cooldown === 'number',
        error: 'Command cooldown must be a number'
      },
      {
        check: () =>
          !cmd.category ||
          Object.prototype.hasOwnProperty.call(CommandCategory, cmd.category),
        error: `Not a valid category ${cmd.category}`
      }
    ]

    for (const { check, error } of validations) {
      if (!check()) throw new Error(error)
    }

    // Permissions Validation
    const validatePermissions = (perms, type) => {
      if (!Array.isArray(perms)) {
        throw new TypeError(
          `Command ${type} must be an Array of permission key strings.`
        )
      }

      perms.forEach(perm => {
        if (!permissions[perm])
          throw new RangeError(`Invalid command ${type}: ${perm}`)
      })
    }

    if (cmd.userPermissions)
      validatePermissions(cmd.userPermissions, 'userPermissions')
    if (cmd.botPermissions)
      validatePermissions(cmd.botPermissions, 'botPermissions')

    // Validations Array Check
    if (cmd.validations?.length) {
      if (!Array.isArray(cmd.validations)) {
        throw new TypeError(
          'Command validations must be an Array of validation Objects.'
        )
      }

      cmd.validations.forEach(validation => {
        if (typeof validation !== 'object')
          throw new TypeError('Command validations must be an object.')
        if (typeof validation.callback !== 'function')
          throw new TypeError('Command validation callback must be a function.')
        if (typeof validation.message !== 'string')
          throw new TypeError('Command validation message must be a string.')
      })
    }

    // Slash Command Validation
    if (cmd.slashCommand) {
      const { slashCommand } = cmd

      if (typeof slashCommand !== 'object') {
        throw new TypeError('Command.slashCommand must be an object')
      }

      if (
        'enabled' in slashCommand &&
        typeof slashCommand.enabled !== 'boolean'
      ) {
        throw new TypeError(
          'Command.slashCommand enabled must be a boolean value'
        )
      }

      if (
        'ephemeral' in slashCommand &&
        typeof slashCommand.ephemeral !== 'boolean'
      ) {
        throw new TypeError(
          'Command.slashCommand ephemeral must be a boolean value'
        )
      }

      if (slashCommand.options && !Array.isArray(slashCommand.options)) {
        throw new TypeError('Command.slashCommand options must be a array')
      }

      if (slashCommand.enabled && typeof cmd.interactionRun !== 'function') {
        throw new TypeError("Missing 'interactionRun' function")
      }
    }
  }

  static validateContext(context) {
    if (!context || typeof context !== 'object') {
      throw new TypeError('Context must be an object')
    }

    const validations = [
      {
        check: () =>
          typeof context.name === 'string' &&
          context.name === context.name.toLowerCase(),
        error: 'Context name must be a lowercase string.'
      },
      {
        check: () => typeof context.description === 'string',
        error: 'Context description must be a string.'
      },
      {
        check: () =>
          [
            ApplicationCommandType.User,
            ApplicationCommandType.Message
          ].includes(context.type),
        error: 'Context type must be a either User/Message.'
      },
      {
        check: () =>
          !('enabled' in context) || typeof context.enabled === 'boolean',
        error: 'Context enabled must be a boolean value'
      },
      {
        check: () =>
          !('ephemeral' in context) || typeof context.ephemeral === 'boolean',
        error: 'Context ephemeral must be a boolean value'
      },
      {
        check: () =>
          !('defaultPermission' in context) ||
          typeof context.defaultPermission === 'boolean',
        error: 'Context defaultPermission must be a boolean value'
      },
      {
        check: () =>
          !('cooldown' in context) || typeof context.cooldown === 'number',
        error: 'Context cooldown must be a number'
      }
    ]

    for (const { check, error } of validations) {
      if (!check()) throw new Error(error)
    }

    if (context.userPermissions) {
      if (!Array.isArray(context.userPermissions)) {
        throw new TypeError(
          'Context userPermissions must be an Array of permission key strings.'
        )
      }

      context.userPermissions.forEach(perm => {
        if (!permissions[perm])
          throw new RangeError(`Invalid command userPermission: ${perm}`)
      })
    }
  }
}

export const validateConfiguration = () => Validator.validateConfiguration()
export const validateCommand = cmd => Validator.validateCommand(cmd)
export const validateContext = context => Validator.validateContext(context)
