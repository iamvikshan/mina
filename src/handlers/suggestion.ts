import { getSettings } from '@schemas/Guild'
import { findSuggestion, deleteSuggestionDb } from '@schemas/Suggestions'
import { SUGGESTIONS } from '@src/config'

import {
  ActionRowBuilder,
  ButtonBuilder,
  ModalBuilder,
  TextInputBuilder,
  EmbedBuilder,
  ButtonStyle,
  TextInputStyle,
  type Message,
  type GuildMember,
  type TextBasedChannel,
  type ButtonInteraction,
  type ModalSubmitInteraction
} from 'discord.js'
import { stripIndents } from 'common-tags'

interface StatusUpdate {
  user_id: string
  status: 'APPROVED' | 'REJECTED'
  reason?: string
  timestamp: Date
}

const getStats = (message: Message) => {
  const upVotes =
    (message.reactions.resolve(SUGGESTIONS.EMOJI.UP_VOTE)?.count ?? 1) - 1
  const downVotes =
    (message.reactions.resolve(SUGGESTIONS.EMOJI.DOWN_VOTE)?.count ?? 1) - 1
  return [upVotes, downVotes] as const
}

const getVotesMessage = (upVotes: number, downVotes: number): string => {
  const total = upVotes + downVotes
  if (total === 0) {
    return stripIndents`
      _Upvotes: NA_
      _Downvotes: NA_
    `
  }

  const upVotePercentage = Math.round((upVotes / total) * 100)
  const downVotePercentage = Math.round((downVotes / total) * 100)

  return stripIndents`
    _Upvotes: ${upVotes} [${upVotePercentage}%]_
    _Downvotes: ${downVotes} [${downVotePercentage}%]_
  `
}

const hasPerms = (member: GuildMember, settings: any): boolean =>
  member.permissions.has('ManageGuild') ||
  member.roles.cache.some(r => settings.server.staff_roles.includes(r.id))

const approveSuggestion = async (
  member: GuildMember,
  channel: TextBasedChannel,
  messageId: string,
  reason?: string
): Promise<string> => {
  const { guild } = member
  const settings = await getSettings(guild)

  if (!hasPerms(member, settings)) {
    return "You don't have permission to approve suggestions!"
  }

  const doc = await findSuggestion(guild.id, messageId)
  if (!doc) return 'Suggestion not found'
  if (doc.status === 'APPROVED') return 'Suggestion already approved'

  let message: Message
  try {
    message = await channel.messages.fetch({ message: messageId, force: true })
  } catch {
    return 'Suggestion message not found'
  }

  const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('SUGGEST_APPROVE')
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('SUGGEST_REJECT')
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('SUGGEST_DELETE')
      .setLabel('Delete')
      .setStyle(ButtonStyle.Secondary)
  )

  const approvedEmbed = new EmbedBuilder()
    .setDescription(message.embeds[0].data.description)
    .setColor(SUGGESTIONS.APPROVED_EMBED)
    .setAuthor({ name: 'Suggestion Approved' })
    .setFooter({
      text: `Approved By ${member.user.username}`,
      iconURL: member.displayAvatarURL()
    })
    .setTimestamp()

  const fields = []

  const statsField = message.embeds[0].fields.find(
    field => field.name === 'Stats'
  )
  if (!statsField) {
    const [upVotes, downVotes] = getStats(message)
    doc.stats.upvotes = upVotes
    doc.stats.downvotes = downVotes
    fields.push({ name: 'Stats', value: getVotesMessage(upVotes, downVotes) })
  } else {
    fields.push(statsField)
  }

  if (reason) {
    fields.push({ name: 'Reason', value: '```' + reason + '```' })
  }

  approvedEmbed.addFields(fields)

  try {
    doc.status = 'APPROVED'
    doc.status_updates.push({
      user_id: member.id,
      status: 'APPROVED',
      reason,
      timestamp: new Date()
    })

    const approveChannel = settings.suggestions.approved_channel
      ? guild.channels.cache.get(settings.suggestions.approved_channel)
      : null

    if (!approveChannel || !approveChannel.isTextBased()) {
      await message.edit({ embeds: [approvedEmbed], components: [buttonsRow] })
      await message.reactions.removeAll()
    } else {
      const sent = await approveChannel.send({
        embeds: [approvedEmbed],
        components: [buttonsRow]
      })
      doc.channel_id = approveChannel.id
      doc.message_id = sent.id
      await message.delete()
    }

    await doc.save()
    return 'Suggestion approved'
  } catch (ex) {
    guild.client.logger.error('approveSuggestion', ex)
    return 'Failed to approve suggestion'
  }
}

const rejectSuggestion = async (
  member: GuildMember,
  channel: TextBasedChannel,
  messageId: string,
  reason?: string
): Promise<string> => {
  const { guild } = member
  const settings = await getSettings(guild)

  if (!hasPerms(member, settings)) {
    return "You don't have permission to reject suggestions!"
  }

  const doc = await findSuggestion(guild.id, messageId)
  if (!doc) return 'Suggestion not found'
  if (doc.is_rejected) return 'Suggestion already rejected'

  let message: Message
  try {
    message = await channel.messages.fetch({ message: messageId })
  } catch {
    return 'Suggestion message not found'
  }

  const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('SUGGEST_APPROVE')
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('SUGGEST_REJECT')
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('SUGGEST_DELETE')
      .setLabel('Delete')
      .setStyle(ButtonStyle.Secondary)
  )

  const rejectedEmbed = new EmbedBuilder()
    .setDescription(message.embeds[0].data.description)
    .setColor(SUGGESTIONS.DENIED_EMBED)
    .setAuthor({ name: 'Suggestion Rejected' })
    .setFooter({
      text: `Rejected By ${member.user.username}`,
      iconURL: member.displayAvatarURL()
    })
    .setTimestamp()

  const fields = []

  const statsField = message.embeds[0].fields.find(
    field => field.name === 'Stats'
  )
  if (!statsField) {
    const [upVotes, downVotes] = getStats(message)
    doc.stats.upvotes = upVotes
    doc.stats.downvotes = downVotes
    fields.push({ name: 'Stats', value: getVotesMessage(upVotes, downVotes) })
  } else {
    fields.push(statsField)
  }

  if (reason) {
    fields.push({ name: 'Reason', value: '```' + reason + '```' })
  }

  rejectedEmbed.addFields(fields)

  try {
    doc.status = 'REJECTED'
    doc.status_updates.push({
      user_id: member.id,
      status: 'REJECTED',
      reason,
      timestamp: new Date()
    })

    const rejectChannel = settings.suggestions.rejected_channel
      ? guild.channels.cache.get(settings.suggestions.rejected_channel)
      : null

    if (!rejectChannel) {
      await message.edit({ embeds: [rejectedEmbed], components: [buttonsRow] })
      await message.reactions.removeAll()
    } else {
      const sent = await rejectChannel.send({
        embeds: [rejectedEmbed],
        components: [buttonsRow]
      })
      doc.channel_id = rejectChannel.id
      doc.message_id = sent.id
      await message.delete()
    }

    await doc.save()
    return 'Suggestion rejected'
  } catch (ex) {
    guild.client.logger.error('rejectSuggestion', ex)
    return 'Failed to reject suggestion'
  }
}

const deleteSuggestion = async (
  member: GuildMember,
  channel: TextBasedChannel,
  messageId: string,
  reason?: string
): Promise<string> => {
  const { guild } = member
  const settings = await getSettings(guild)

  if (!hasPerms(member, settings)) {
    return "You don't have permission to delete suggestions!"
  }

  try {
    await channel.messages.delete(messageId)
    await deleteSuggestionDb(guild.id, messageId, member.id, reason)
    return 'Suggestion deleted'
  } catch (ex) {
    guild.client.logger.error('deleteSuggestion', ex)
    return 'Failed to delete suggestion! Please delete manually'
  }
}

const handleApproveBtn = async (
  interaction: ButtonInteraction
): Promise<void> => {
  await interaction.showModal(
    new ModalBuilder({
      title: 'Approve Suggestion',
      customId: 'SUGGEST_APPROVE_MODAL',
      components: [
        new ActionRowBuilder<TextInputBuilder>().addComponents([
          new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('reason')
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(4)
        ])
      ]
    })
  )
}

const handleApproveModal = async (
  modal: ModalSubmitInteraction
): Promise<void> => {
  await modal.deferReply({ ephemeral: true })
  const reason = modal.fields.getTextInputValue('reason')
  const response = await approveSuggestion(
    modal.member as GuildMember,
    modal.channel!,
    modal.message!.id,
    reason
  )
  await modal.followUp(response)
}

const handleRejectBtn = async (
  interaction: ButtonInteraction
): Promise<void> => {
  await interaction.showModal(
    new ModalBuilder({
      title: 'Reject Suggestion',
      customId: 'SUGGEST_REJECT_MODAL',
      components: [
        new ActionRowBuilder<TextInputBuilder>().addComponents([
          new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('reason')
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(4)
        ])
      ]
    })
  )
}

const handleRejectModal = async (
  modal: ModalSubmitInteraction
): Promise<void> => {
  await modal.deferReply({ ephemeral: true })
  const reason = modal.fields.getTextInputValue('reason')
  const response = await rejectSuggestion(
    modal.member as GuildMember,
    modal.channel!,
    modal.message!.id,
    reason
  )
  await modal.followUp(response)
}

const handleDeleteBtn = async (
  interaction: ButtonInteraction
): Promise<void> => {
  await interaction.showModal(
    new ModalBuilder({
      title: 'Delete Suggestion',
      customId: 'SUGGEST_DELETE_MODAL',
      components: [
        new ActionRowBuilder<TextInputBuilder>().addComponents([
          new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('reason')
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(4)
        ])
      ]
    })
  )
}

const handleDeleteModal = async (
  modal: ModalSubmitInteraction
): Promise<void> => {
  await modal.deferReply({ ephemeral: true })
  const reason = modal.fields.getTextInputValue('reason')
  const response = await deleteSuggestion(
    modal.member as GuildMember,
    modal.channel!,
    modal.message!.id,
    reason
  )
  await modal.followUp({ content: response, ephemeral: true })
}

export {
  handleApproveBtn,
  handleApproveModal,
  handleRejectBtn,
  handleRejectModal,
  handleDeleteBtn,
  handleDeleteModal,
  approveSuggestion,
  rejectSuggestion,
  deleteSuggestion
}
