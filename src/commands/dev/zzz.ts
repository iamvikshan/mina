const {
  ApplicationCommandOptionType,
  ApplicationCommandType
} from 'discord.js'
import { EmbedBuilder } from 'discord.js'
import { EMBED_COLORS } from '@src/config'
const { setDevCommands } from '@schemas/Dev'

/**
 * @type {import("@structures/Command")}
 */
export default {
  name: 'zzz',
  description: 'Toggle dev commands on/off',
  category: 'DEV',
  botPermissions: ['EmbedLinks'],
  testGuildOnly: true,
  slashCommand: {
    enabled: true,
    ephemeral: true,
    options: [
      {
        name: 'enabled',
        description: 'Enable or disable dev commands',
        type: ApplicationCommandOptionType.Boolean,
        required: true
      }
    ]
  },

  async interactionRun(interaction) {
    const { client } = interaction

    const enabled = interaction.options.getBoolean('enabled')

    // Update database state
    await setDevCommands(enabled)

    // Register/Unregister commands in test guild
    const testGuild = client.guilds.cache.get(process.env.TEST_GUILD_ID)
    if (testGuild) {
      try {
        const commandsToSet = client.slashCommands
          .filter(cmd => cmd.testGuildOnly || (cmd.devOnly && enabled))
          .map(cmd => ({
            name: cmd.name,
            description: cmd.description,
            type: ApplicationCommandType.ChatInput,
            options: cmd.slashCommand.options
          }))

        await testGuild.commands.set(commandsToSet)

        client.logger.success(
          `Updated test guild commands. ${
            enabled ? 'Enabled' : 'Disabled'
          } dev commands.`
        )
      } catch (error) {
        client.logger.error(
          `Failed to update test guild commands: ${error.message}`
        )
        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setColor(EMBED_COLORS.ERROR)
              .setDescription(
                'Failed to update test guild commands. Check bot logs for details.'
              )
          ]
        })
      }
    }

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.SUCCESS)
      .setDescription(
        `✅ Dev commands are now ${enabled ? 'enabled' : 'disabled'}!\n` +
          `Current state: \`${enabled ? 'ENABLED' : 'DISABLED'}\``
      )

    return interaction.followUp({ embeds: [embed] })
  }
}
