const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const Ticket = require('../models/Ticket');
const GuildConfig = require('../models/GuildConfig');

const getNextTicketNumber = async (guildId) => {
  const last = await Ticket.findOne({ guildId, ticketNumber: { $exists: true, $type: 'number' } }).sort({ ticketNumber: -1 });
  const lastNum = last?.ticketNumber;
  return (lastNum && !isNaN(lastNum)) ? lastNum + 1 : 1;
};

const buildTranscript = async (channel) => {
  const messages = await channel.messages.fetch({ limit: 100 });
  const lines = [];
  messages.reverse().forEach(m => {
    lines.push(`[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content}`);
  });
  return lines.join('\n');
};

const handleTicketOpen = async (interaction, buttonId) => {
  await interaction.deferReply({ ephemeral: true });

  const config = await GuildConfig.findOne({ guildId: interaction.guildId });
  if (!config) return interaction.editReply({ content: '❌ Configuration introuvable.' });

  const buttonConfig = config.ticketPanel.buttons.find(b => b.id === buttonId);
  if (!buttonConfig) return interaction.editReply({ content: '❌ Bouton introuvable.' });

  const maxTickets = config.maxTicketsPerUser || 1;
  const openTickets = await Ticket.find({ userId: interaction.user.id, guildId: interaction.guildId, status: { $in: ['open', 'claimed'] } });
  if (openTickets.length >= maxTickets) {
    const list = openTickets.map(t => `<#${t.channelId}>`).join(', ');
    return interaction.editReply({ content: `❌ Tu as déjà **${openTickets.length}/${maxTickets}** ticket${maxTickets > 1 ? 's' : ''} ouvert${maxTickets > 1 ? 's' : ''} : ${list}` });
  }

  const ticketNumber = await getNextTicketNumber(interaction.guildId);
  const channelName = `ticket-${String(ticketNumber).padStart(4, '0')}`;

  const parent = config.ticketCategoryId || null;
  const guild = interaction.guild;

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ...(config.staffRoleId ? [{ id: config.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] : []),
    ],
  });

  const ticket = new Ticket({
    guildId: interaction.guildId,
    channelId: channel.id,
    userId: interaction.user.id,
    category: buttonConfig.category,
    ticketNumber,
  });
  await ticket.save();

  const embed = new EmbedBuilder()
    .setTitle(`${buttonConfig.label} — Ticket #${String(ticketNumber).padStart(4, '0')}`)
    .setDescription(`Bonjour <@${interaction.user.id}> !\nUn membre du staff va prendre en charge votre demande.\n\n**Catégorie :** ${buttonConfig.category}`)
    .setColor(0x5865F2)
    .setFooter({ text: 'Ohio Paradise' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket_claim_${ticket._id}`).setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('✋'),
    new ButtonBuilder().setCustomId(`ticket_close_direct_${ticket._id}`).setLabel('Fermer').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
  );

  await channel.send({ content: `<@${interaction.user.id}> ${config.staffRoleId ? `<@&${config.staffRoleId}>` : ''}`, embeds: [embed], components: [row] });
  await interaction.editReply({ content: `✅ Ton ticket a été créé : <#${channel.id}>` });
};

const handleTicketClaim = async (interaction, ticketId) => {
  await interaction.deferUpdate();

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return;
  if (ticket.status !== 'open') return interaction.followUp({ ephemeral: true, content: '❌ Ce ticket n\'est plus disponible pour le claim.' });

  ticket.status = 'claimed';
  ticket.claimedBy = interaction.user.id;
  await ticket.save();

  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(0x57F287)
    .setDescription(interaction.message.embeds[0].description + `\n\n✋ **Claim par :** <@${interaction.user.id}>`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket_claim_${ticketId}`).setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('✋').setDisabled(true),
    new ButtonBuilder().setCustomId(`ticket_close_direct_${ticketId}`).setLabel('Fermer').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
  );

  await interaction.message.edit({ embeds: [embed], components: [row] });
};

const handleTicketCloseConfirm = async (interaction, ticketId) => {
  await interaction.deferUpdate();

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return;

  const channel = interaction.channel;
  const transcript = await buildTranscript(channel);

  ticket.status = 'closed';
  ticket.closedAt = new Date();
  ticket.closedBy = interaction.user.id;
  ticket.transcript = transcript;
  await ticket.save();

  const config = await GuildConfig.findOne({ guildId: interaction.guildId });

  if (config?.logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle(`📁 Ticket #${String(ticket.ticketNumber).padStart(4, '0')} fermé`)
        .addFields(
          { name: 'Ouvert par', value: `<@${ticket.userId}>`, inline: true },
          { name: 'Fermé par', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Catégorie', value: ticket.category, inline: true },
        )
        .setColor(0xED4245)
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] });
    }
  }

  await channel.send({ content: '🔒 Ticket fermé. Ce channel sera supprimé dans 5 secondes.' });
  setTimeout(() => channel.delete().catch(() => {}), 5000);
};

const handleTicketCloseDirect = async (interaction, ticketId) => {
  await interaction.deferReply({ ephemeral: true });

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return interaction.editReply({ content: '❌ Ticket introuvable.' });

  const embed = new EmbedBuilder()
    .setTitle('🔒 Confirmer la fermeture')
    .setDescription('Voulez-vous vraiment fermer ce ticket ?')
    .setColor(0xED4245);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket_confirm_close_${ticketId}`).setLabel('Confirmer').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ticket_cancel_close_${ticketId}`).setLabel('Annuler').setStyle(ButtonStyle.Secondary),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
};

module.exports = { handleTicketOpen, handleTicketClaim, handleTicketCloseConfirm, handleTicketCloseDirect };
