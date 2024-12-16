const { buildGreeting } = require('@handlers/greeting')
const { ApplicationCommandOptionType, ChannelType } from 'discord.js'

/**
 * @type {import("@structures/Command")}
 */
export default {
  name: 'welcome',
  description: 'Set up a cheerful welcome message for your server!',
  category: 'ADMIN',
  userPermissions: ['ManageGuild'],

  slashCommand: {
    enabled: true,
    ephemeral: true,
    options: [
      {
        name: 'status',
        description: 'Enable or disable the welcome message',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'status',
            description: 'Choose ON or OFF',
            required: true,
            type: ApplicationCommandOptionType.String,
            choices: [
              {
                name: 'ON',
                value: 'ON'
              },
              {
                name: 'OFF',
                value: 'OFF'
              }
            ]
          }
        ]
      },
      {
        name: 'preview',
        description: 'Preview the configured welcome message!',
        type: ApplicationCommandOptionType.Subcommand
      },
      {
        name: 'channel',
        description: 'Set the channel for welcome messages',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'channel',
            description: 'Select a channel',
            type: ApplicationCommandOptionType.Channel,
            channelTypes: [ChannelType.GuildText],
            required: true
          }
        ]
      },
      {
        name: 'desc',
        description: 'Set the embed description for the welcome message',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'content',
            description: 'What would you like the description to say?',
            type: ApplicationCommandOptionType.String,
            required: true
          }
        ]
      },
      {
        name: 'thumbnail',
        description: 'Configure the embed thumbnail',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'status',
            description: 'Thumbnail status (ON/OFF)',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
              {
                name: 'ON',
                value: 'ON'
              },
              {
                name: 'OFF',
                value: 'OFF'
              }
            ]
          }
        ]
      },
      {
        name: 'color',
        description: 'Set the embed color for your welcome message',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'hex-code',
            description: 'Enter the hex color code (e.g., #FF5733)',
            type: ApplicationCommandOptionType.String,
            required: true
          }
        ]
      },
      {
        name: 'footer',
        description: 'Set the footer for the welcome embed',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'content',
            description: 'What should the footer say?',
            type: ApplicationCommandOptionType.String,
            required: true
          }
        ]
      },
      {
        name: 'image',
        description: 'Set an image for the welcome embed',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'url',
            description: 'Enter the image URL',
            type: ApplicationCommandOptionType.String,
            required: true
          }
        ]
      }
    ]
  },

  async interactionRun(interaction, data) {
    const sub = interaction.options.getSubcommand()
    const settings = data.settings

    let response
    switch (sub) {
      case 'preview':
        response = await sendPreview(settings, interaction.member)
        break

      case 'status':
        response = await setStatus(
          settings,
          interaction.options.getString('status')
        )
        break

      case 'channel':
        response = await setChannel(
          settings,
          interaction.options.getChannel('channel')
        )
        break

      case 'desc':
        response = await setDescription(
          settings,
          interaction.options.getString('content')
        )
        break

      case 'thumbnail':
        response = await setThumbnail(
          settings,
          interaction.options.getString('status')
        )
        break

      case 'color':
        response = await setColor(
          settings,
          interaction.options.getString('hex-code')
        )
        break

      case 'footer':
        response = await setFooter(
          settings,
          interaction.options.getString('content')
        )
        break

      case 'image':
        response = await setImage(
          settings,
          interaction.options.getString('url')
        )
        break

      default:
        response = "Oopsie! That's an invalid subcommand. Please try again! 🥺"
    }

    return interaction.followUp(response)
  }
}

async function sendPreview(settings, member) {
  if (!settings.welcome?.enabled)
    return 'Oh no! The welcome message is not enabled in this server. 💔'

  const targetChannel = member.guild.channels.cache.get(
    settings.welcome.channel
  )
  if (!targetChannel)
    return 'Hmm... No channel is configured to send the welcome message. 😢'

  const response = await buildGreeting(member, 'WELCOME', settings.welcome)
  await targetChannel.safeSend(response)

  return `✨ Sent a preview of the welcome message to ${targetChannel.toString()}!`
}

async function setStatus(settings, status) {
  const enabled = status.toUpperCase() === 'ON'
  settings.welcome.enabled = enabled
  await settings.save()
  return `🎉 Configuration saved! Welcome message has been ${status === 'ON' ? 'enabled' : 'disabled'}.`
}

async function setChannel(settings, channel) {
  if (!channel.canSendEmbeds()) {
    return `Oh no! I can't send greetings to that channel. I need the \`Write Messages\` and \`Embed Links\` permissions in ${channel.toString()}! 💦`
  }
  settings.welcome.channel = channel.id
  await settings.save()
  return `📢 Configuration saved! Welcome messages will now be sent to ${channel.toString()}!`
}

async function setDescription(settings, desc) {
  settings.welcome.embed.description = desc
  await settings.save()
  return '💖 Configuration saved! The welcome message description has been updated. 🌈'
}

async function setThumbnail(settings, status) {
  settings.welcome.embed.thumbnail = status.toUpperCase() === 'ON'
  await settings.save()
  return '🌸 Configuration saved! The thumbnail for the welcome message has been updated. 🎀'
}

async function setColor(settings, color) {
  settings.welcome.embed.color = color
  await settings.save()
  return '🎨 Configuration saved! The color for the welcome message has been updated. 🌟'
}

async function setFooter(settings, content) {
  settings.welcome.embed.footer = content
  await settings.save()
  return '📝 Configuration saved! The footer for the welcome message has been updated. ✨'
}

async function setImage(settings, url) {
  settings.welcome.embed.image = url
  await settings.save()
  return '🖼️ Configuration saved! The image for the welcome message has been updated. 🎉'
}
