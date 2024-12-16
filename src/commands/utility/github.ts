import { EmbedBuilder, ApplicationCommandOptionType } from 'discord.js'
const { MESSAGES } from '@src/config.js'
const { getJson } = require('@helpers/HttpUtils')
const { stripIndent } from 'common-tags'

/**
 * @type {import("@structures/Command")}
 */
export default {
  name: 'github',
  description: 'shows github statistics of a user',
  cooldown: 10,
  category: 'UTILITY',
  botPermissions: ['EmbedLinks'],

  slashCommand: {
    enabled: true,
    options: [
      {
        name: 'username',
        description: 'github username',
        type: ApplicationCommandOptionType.String,
        required: true
      }
    ]
  },

  async interactionRun(interaction) {
    const username = interaction.options.getString('username')
    const response = await getGithubUser(username, interaction.user)
    await interaction.followUp(response)
  }
}

const websiteProvided = text =>
  text.startsWith('http://') ? true : text.startsWith('https://')

async function getGithubUser(target, author) {
  const response = await getJson(`https://api.github.com/users/${target}`)
  if (response.status === 404) return '```No user found with that name```'
  if (!response.success) return MESSAGES.API_ERROR

  const json = response.data
  const {
    login: username,
    name,
    id: githubId,
    avatar_url: avatarUrl,
    html_url: userPageLink,
    followers,
    following,
    bio,
    location,
    blog
  } = json

  let website = websiteProvided(blog) ? `[Click me](${blog})` : 'Not Provided'
  if (website == null) website = 'Not Provided'

  const embed = new EmbedBuilder()
    .setAuthor({
      name: `GitHub User: ${username}`,
      url: userPageLink,
      iconURL: avatarUrl
    })
    .addFields(
      {
        name: 'User Info',
        value: stripIndent`
        **Real Name**: *${name || 'Not Provided'}*
        **Location**: *${location}*
        **GitHub ID**: *${githubId}*
        **Website**: *${website}*\n`,
        inline: true
      },
      {
        name: 'Social Stats',
        value: `**Followers**: *${followers}*\n**Following**: *${following}*`,
        inline: true
      }
    )
    .setDescription(`**Bio**:\n${bio || 'Not Provided'}`)
    .setImage(avatarUrl)
    .setColor(0x6e5494)
    .setFooter({ text: `Requested by ${author.username}` })

  return { embeds: [embed] }
}
