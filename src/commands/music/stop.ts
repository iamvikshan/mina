const { musicValidations } = require('@helpers/BotUtils')

/**
 * @type {import("@structures/Command")}
 */
export default {
  name: 'stop',
  description: 'Stop the music player',
  category: 'MUSIC',
  validations: musicValidations,

  slashCommand: {
    enabled: true
  },

  async interactionRun(interaction, data) {
    const response = await stop(interaction, data.settings)
    await interaction.followUp(response)
  }
}

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
async function stop({ client, guildId }) {
  const player = client.musicManager.getPlayer(guildId)

  if (!player || !player.queue.current) {
    return "🚫 There's no music currently playing"
  }

  if (player.get('autoplay') === true) {
    player.set('autoplay', false)
  }

  player.stopPlaying(true, false)

  return '🎶 The music player is stopped, and the queue has been cleared'
}
