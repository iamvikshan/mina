import { getSettings } from '@schemas/Guild'
import { Guild } from 'discord.js'
import { BotClient } from '@src/structures'
import { GuildSettings } from '../types'

const updateCounterChannels = async (client: BotClient): Promise<void> => {
  for (const guildId of client.counterUpdateQueue) {
    const guild = client.guilds.cache.get(guildId)
    if (!guild) continue

    try {
      const settings = await getSettings(guild)
      const all = guild.memberCount
      const bots = settings.server.bots
      const members = all - bots

      await Promise.all(
        settings.counters.map(async config => {
          const vc = guild.channels.cache.get(config.channel_id)
          if (!vc?.manageable) return

          const channelName = (() => {
            switch (config.counter_type.toUpperCase()) {
              case 'USERS':
                return `${config.name} : ${all}`
              case 'MEMBERS':
                return `${config.name} : ${members}`
              case 'BOTS':
                return `${config.name} : ${bots}`
              default:
                return null
            }
          })()

          if (channelName) {
            try {
              await vc.setName(channelName)
            } catch (err) {
              client.logger.log('Set Name error: ', err)
            }
          }
        })
      )
    } catch (ex) {
      client.logger.error(
        `Error updating counter channels for guildId: ${guildId}`,
        ex
      )
    } finally {
      const index = client.counterUpdateQueue.indexOf(guild.id)
      if (index > -1) client.counterUpdateQueue.splice(index, 1)
    }
  }
}

const init = async (
  guild: Guild,
  settings: GuildSettings
): Promise<boolean> => {
  const hasSpecialCounters = settings.counters.some(doc =>
    ['MEMBERS', 'BOTS'].includes(doc.counter_type.toUpperCase())
  )

  if (hasSpecialCounters) {
    const bots = guild.members.cache.filter(member => member.user.bot).size
    settings.server.bots = bots
    await settings.save()
  }

  if (!(guild.client as BotClient).counterUpdateQueue.includes(guild.id)) {
    ;(guild.client as BotClient).counterUpdateQueue.push(guild.id)
  }

  return true
}

export const counterHandler = {
  init,
  updateCounterChannels
}
