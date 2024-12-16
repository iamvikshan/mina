import { ActivityType } from 'discord.js'
import { getPresenceConfig } from '@schemas/Dev'

const updatePresence = async client => {
  const config = await getPresenceConfig()

  if (!config.PRESENCE.ENABLED) {
    return client.user.setPresence({
      status: 'invisible',
      activities: []
    })
  }

  let message = config.PRESENCE.MESSAGE

  if (message.includes('{servers}')) {
    message = message.replaceAll('{servers}', client.guilds.cache.size)
  }

  if (message.includes('{members}')) {
    const members = [...client.guilds.cache.values()].reduce(
      (sum, guild) => sum + guild.memberCount,
      0
    )
    message = message.replaceAll('{members}', members)
  }

  const getType = type => {
    const types = {
      COMPETING: ActivityType.Competing,
      LISTENING: ActivityType.Listening,
      PLAYING: ActivityType.Playing,
      WATCHING: ActivityType.Watching,
      STREAMING: ActivityType.Streaming,
      CUSTOM: ActivityType.Custom
    }
    return types[type] ?? ActivityType.Playing
  }

  const activity = {
    name: message,
    type: getType(config.PRESENCE.TYPE),
    ...(config.PRESENCE.TYPE === 'STREAMING' && { url: config.PRESENCE.URL }),
    ...(config.PRESENCE.TYPE === 'CUSTOM' && { state: config.PRESENCE.MESSAGE })
  }

  await client.user.setPresence({
    status: config.PRESENCE.STATUS,
    activities: [activity]
  })

  client.logger.log(
    `Presence Updated: STATUS:${config.PRESENCE.STATUS}, TYPE:${config.PRESENCE.TYPE}`
  )
}

export const presenceHandler = async client => {
  await updatePresence(client)
  setInterval(() => updatePresence(client), 10 * 60 * 1000)
}
