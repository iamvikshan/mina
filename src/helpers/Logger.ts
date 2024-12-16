import config from '@src/config'
import { EmbedBuilder, WebhookClient } from 'discord.js'
import pino from 'pino'

const webhookLogger = process.env.LOGS_WEBHOOK
  ? new WebhookClient({
      url: process.env.LOGS_WEBHOOK
    })
  : undefined

const today = new Date()
const pinoLogger = pino(
  {
    level: 'debug'
  },
  pino.multistream([
    {
      level: 'info',
      stream: pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:mm:ss',
          ignore: 'pid,hostname',
          singleLine: false,
          hideObject: true,
          customColors: 'info:blue,warn:yellow,error:red'
        }
      })
    },
    {
      level: 'debug',
      stream: pino.destination({
        dest: `${process.cwd()}/logs/combined-${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}.log`,
        sync: true,
        mkdir: true
      })
    }
  ])
)

function sendWebhook(content, err) {
  if (!content && !err) return
  const errString = err?.stack || err

  const embed = new EmbedBuilder()
    .setColor(config.EMBED_COLORS.ERROR)
    .setAuthor({ name: err?.name || 'Error' })

  if (errString)
    embed.setDescription(
      '```js\n' +
        (errString.length > 4096
          ? `${errString.substr(0, 4000)}...`
          : errString) +
        '\n```'
    )

  embed.addFields({
    name: 'Description',
    value: content || err?.message || 'NA'
  })
  webhookLogger
    .send({
      username: 'Logs',
      embeds: [embed]
    })
    .catch(ex => {})
}

export class Logger {
  /**
   * @param {string} content
   */
  static success(content) {
    pinoLogger.info(content)
  }

  /**
   * @param {string} content
   */
  static log(content) {
    pinoLogger.info(content)
  }

  /**
   * @param {string} content
   */
  static warn(content) {
    pinoLogger.warn(content)
  }

  /**
   * @param {string} content
   * @param {object} ex
   */
  static error(content, ex) {
    if (ex) {
      pinoLogger.error(ex, `${content}: ${ex?.message}`)
    } else {
      pinoLogger.error(content)
    }
    if (webhookLogger) sendWebhook(content, ex)
  }

  /**
   * @param {string} content
   */
  static debug(content) {
    pinoLogger.debug(content)
  }
}

export const log = (content: string) => pinoLogger.info(content)
export const warn = (content: string) => pinoLogger.warn(content)
export const error = (content: string, ex?: any) => {
  if (ex) {
    pinoLogger.error(ex, `${content}: ${ex?.message}`)
  } else {
    pinoLogger.error(content)
  }
  if (webhookLogger) sendWebhook(content, ex)
}
export const debug = (content: string) => pinoLogger.debug(content)
export const success = (content: string) => pinoLogger.info(content)

export default Logger
