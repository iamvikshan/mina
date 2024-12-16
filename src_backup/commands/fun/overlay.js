const {
  EmbedBuilder,
  AttachmentBuilder,
  ApplicationCommandOptionType
} = require('discord.js')
const { getBuffer } = require('@helpers/HttpUtils')
const { EMBED_COLORS, IMAGE } = require('@src/config.js')

const availableOverlays = [
  'approved',
  'brazzers',
  'gay',
  'halloween',
  'rejected',
  'thuglife',
  'to-be-continued',
  'wasted'
]

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: 'overlay',
  description: 'transform your image with some creative chaos!',
  category: 'IMAGE',
  botPermissions: ['EmbedLinks', 'AttachFiles'],
  cooldown: 1,
  slashCommand: {
    enabled: IMAGE.ENABLED,
    options: [
      {
        name: 'name',
        description: 'pick your flavor of artistic mayhem',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: availableOverlays.map(overlay => ({
          name: overlay,
          value: overlay
        }))
      },
      {
        name: 'user',
        description: 'whose picture should we mess with?',
        type: ApplicationCommandOptionType.User,
        required: false
      },
      {
        name: 'link',
        description: 'got a specific image you want to transform?',
        type: ApplicationCommandOptionType.String,
        required: false
      }
    ]
  },

  async interactionRun(interaction) {
    const author = interaction.user
    const user = interaction.options.getUser('user')
    const imageLink = interaction.options.getString('link')
    const filter = interaction.options.getString('name')

    let image
    if (user) image = user.displayAvatarURL({ size: 256, extension: 'png' })
    if (!image && imageLink) image = imageLink
    if (!image) image = author.displayAvatarURL({ size: 256, extension: 'png' })

    const url = getOverlay(filter, image)
    const response = await getBuffer(url, {
      headers: {
        Authorization: `Bearer ${process.env.STRANGE_API_KEY}`
      }
    })

    if (!response.success)
      return interaction.followUp(
        'oops! something went wrong with the image magic'
      )

    const attachment = new AttachmentBuilder(response.buffer, {
      name: 'attachment.png'
    })
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setImage('attachment://attachment.png')
      .setFooter({ text: `sparkled up by ${author.username}` })

    await interaction.followUp({ embeds: [embed], files: [attachment] })
  }
}

function getOverlay(filter, image) {
  const endpoint = new URL(`${IMAGE.BASE_API}/overlays/${filter}`)
  endpoint.searchParams.append('image', image)
  return endpoint.href
}
