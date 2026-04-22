const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
  PermissionFlagsBits, ChannelType,
} = require('discord.js');
const Ticket = require('../models/Ticket');
const GuildConfig = require('../models/GuildConfig');
const axios = require('axios');

const CRYPTO_IDS = { BTC: 'bitcoin', ETH: 'ethereum', LTC: 'litecoin', XMR: 'monero', USDT: 'tether', SOL: 'solana' };
const FIAT_LIKE = ['PAYPAL', 'CASHAPP', 'EUR', 'USD', 'LYDIA', 'VIREMENT'];

const fmt = (txt, vars) => txt.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);

const getRate = async (from, to) => {
  const fromId = CRYPTO_IDS[from];
  const toId = CRYPTO_IDS[to];
  try {
    if (fromId && toId) {
      const r = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${fromId},${toId}&vs_currencies=usd`);
      const fromUSD = r.data[fromId]?.usd || 1;
      const toUSD = r.data[toId]?.usd || 1;
      return fromUSD / toUSD;
    }
    if (fromId && !toId) {
      const r = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${fromId}&vs_currencies=usd`);
      return r.data[fromId]?.usd || 1;
    }
    if (!fromId && toId) {
      const r = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${toId}&vs_currencies=usd`);
      return 1 / (r.data[toId]?.usd || 1);
    }
    return 1;
  } catch {
    return 1;
  }
};

const getNextTicketNumber = async (guildId) => {
  const last = await Ticket.findOne({ guildId }).sort({ ticketNumber: -1 });
  return last ? last.ticketNumber + 1 : 1;
};

const handleExchangePanelOpen = async (interaction) => {
  await interaction.deferReply({ ephemeral: true });
  const config = await GuildConfig.findOne({ guildId: interaction.guildId });
  if (!config) return interaction.editReply({ content: '❌ Configuration introuvable.' });

  const existing = await Ticket.findOne({
    userId: interaction.user.id,
    guildId: interaction.guildId,
    category: 'exchange',
    status: { $in: ['open', 'claimed'] },
  });

  const msgs = config.exchangeMessages || {};
  if (existing) {
    return interaction.editReply({
      content: fmt(msgs.alreadyOpenMsg || '❌ Tu as déjà un ticket exchange ouvert : {channel}', { channel: `<#${existing.channelId}>` }),
    });
  }

  const activePairs = config.exchangeConfig?.activePairs || [];
  const froms = [...new Set(activePairs.map(p => p.split('_')[0]))];
  const tos = [...new Set(activePairs.map(p => p.split('_')[1]))];

  const fromOptions = froms.map(c => ({ label: c, value: c, emoji: CRYPTO_IDS[c] ? '🪙' : '💵' }));
  const toOptions = tos.map(c => ({ label: c, value: c, emoji: CRYPTO_IDS[c] ? '🪙' : '💵' }));

  if (!fromOptions.length || !toOptions.length) {
    return interaction.editReply({ content: fmt(msgs.pairDisabledMsg || '❌ Aucune paire disponible.', {}) });
  }

  const selectFrom = new StringSelectMenuBuilder()
    .setCustomId('exc_ticket_from')
    .setPlaceholder(msgs.selectFromLabel || '📤 Que veux-tu envoyer ?')
    .addOptions(fromOptions.slice(0, 25));

  const row = new ActionRowBuilder().addComponents(selectFrom);

  await interaction.editReply({
    content: '**Étape 1/3** — Sélectionne la crypto que tu envoies :',
    components: [row],
  });
};

const handleSelectFrom = async (interaction) => {
  const from = interaction.values[0];
  const config = await GuildConfig.findOne({ guildId: interaction.guildId });
  const activePairs = config?.exchangeConfig?.activePairs || [];
  const msgs = config?.exchangeMessages || {};

  const tos = [...new Set(
    activePairs.filter(p => p.startsWith(from + '_')).map(p => p.split('_')[1])
  )];

  if (!tos.length) {
    return interaction.update({
      content: fmt(msgs.pairDisabledMsg || '❌ Aucune destination disponible pour {from}.', { from }),
      components: [],
    });
  }

  const toOptions = tos.map(c => ({ label: c, value: `${from}_${c}`, emoji: CRYPTO_IDS[c] ? '🪙' : '💵' }));

  const selectTo = new StringSelectMenuBuilder()
    .setCustomId('exc_ticket_to')
    .setPlaceholder(msgs.selectToLabel || '📥 Que veux-tu recevoir ?')
    .addOptions(toOptions.slice(0, 25));

  await interaction.update({
    content: `**Étape 2/3** — Tu envoies **${from}**. Sélectionne ce que tu veux recevoir :`,
    components: [new ActionRowBuilder().addComponents(selectTo)],
  });
};

const handleSelectTo = async (interaction) => {
  const pair = interaction.values[0];
  const [from, to] = pair.split('_');
  const config = await GuildConfig.findOne({ guildId: interaction.guildId });
  const msgs = config?.exchangeMessages || {};

  const modal = new ModalBuilder()
    .setCustomId(`exc_ticket_amount_${pair}`)
    .setTitle((msgs.modalTitle || '💱 Montant à échanger').substring(0, 45));

  const amountLabel = fmt(msgs.modalAmountLabel || 'Combien de {from} envoies-tu ?', { from }).substring(0, 45);
  const amountPlaceholder = fmt(msgs.modalAmountPlaceholder || 'ex: 0.5', { from }).substring(0, 100);

  const amountInput = new TextInputBuilder()
    .setCustomId('exc_amount')
    .setLabel(amountLabel)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(amountPlaceholder)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(20);

  modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
  await interaction.showModal(modal);
};

const handleAmountSubmit = async (interaction, pair) => {
  await interaction.deferReply({ ephemeral: true });
  const [from, to] = pair.split('_');
  const rawAmount = interaction.fields.getTextInputValue('exc_amount').replace(',', '.');
  const amount = parseFloat(rawAmount);
  const config = await GuildConfig.findOne({ guildId: interaction.guildId });
  const msgs = config?.exchangeMessages || {};
  const excConfig = config?.exchangeConfig || {};

  if (isNaN(amount) || amount <= 0) {
    return interaction.editReply({ content: fmt(msgs.invalidAmountMsg || '❌ Montant invalide.', {}) });
  }
  if (amount < (excConfig.minAmount || 0)) {
    return interaction.editReply({ content: fmt(msgs.belowMinMsg || '❌ Minimum : {min} {from}', { min: excConfig.minAmount, from }) });
  }
  if (amount > (excConfig.maxAmount || Infinity)) {
    return interaction.editReply({ content: fmt(msgs.aboveMaxMsg || '❌ Maximum : {max} {from}', { max: excConfig.maxAmount, from }) });
  }

  const pairKey = `${from}_${to}`;
  if (!excConfig.activePairs?.includes(pairKey)) {
    return interaction.editReply({ content: fmt(msgs.pairDisabledMsg || '❌ Paire non disponible.', {}) });
  }

  const rate = await getRate(from, to);
  const fee = excConfig.customFees?.get?.(pairKey) ?? excConfig.feePercent ?? 5;
  const rawResult = amount * rate;
  const feeAmt = rawResult * (fee / 100);
  const finalResult = rawResult - feeAmt;

  const ticketNumber = await getNextTicketNumber(interaction.guildId);
  const channelName = `exc-${String(ticketNumber).padStart(4, '0')}`;
  const guild = interaction.guild;
  const parent = config.ticketCategoryId || null;

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
    category: 'exchange',
    ticketNumber,
    notes: [{ content: JSON.stringify({ from, to, amount, rate, fee, finalResult }), addedBy: 'system', addedAt: new Date() }],
  });
  await ticket.save();

  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const color = config.exchangeTicketPanel?.embed?.color || '#F1C40F';
  const colorInt = parseInt(color.replace('#', ''), 16) || 0xF1C40F;

  const title = fmt(msgs.welcomeTitle || '💱 Exchange — {from} → {to}', { from, to });
  const description = fmt(msgs.welcomeDescription || 'Bonjour {user} !\n\nTu souhaites échanger **{amount} {from}** contre **{result} {to}**.', {
    user: `<@${interaction.user.id}>`,
    from, to,
    amount: amount.toFixed(6).replace(/\.?0+$/, ''),
    result: finalResult.toFixed(6).replace(/\.?0+$/, ''),
  });
  const footer = fmt(msgs.welcomeFooter || 'Ohio Paradise Exchange • {date}', { date: now });

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(colorInt)
    .addFields(
      { name: msgs.youSendFieldName || '📤 Tu envoies', value: `**${amount.toFixed(6).replace(/\.?0+$/, '')} ${from}**`, inline: true },
      { name: msgs.youReceiveFieldName || '📥 Tu reçois', value: `**${finalResult.toFixed(6).replace(/\.?0+$/, '')} ${to}**`, inline: true },
      { name: msgs.rateFieldName || '📈 Taux appliqué', value: `1 ${from} = ${rate.toFixed(6).replace(/\.?0+$/, '')} ${to}`, inline: true },
      { name: fmt(msgs.feeFieldName || '💸 Frais ({fee}%)', { fee }), value: `${feeAmt.toFixed(6).replace(/\.?0+$/, '')} ${to}`, inline: true },
      { name: msgs.statusFieldName || '📊 Statut', value: msgs.statusPending || '⏳ En attente de confirmation staff', inline: false },
    )
    .setFooter({ text: footer })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket_claim_${ticket._id}`).setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('✋'),
    new ButtonBuilder().setCustomId(`exc_ticket_done_${ticket._id}`).setLabel('Complété').setStyle(ButtonStyle.Primary).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`exc_ticket_cancel_${ticket._id}`).setLabel('Annuler').setStyle(ButtonStyle.Secondary).setEmoji('🚫'),
    new ButtonBuilder().setCustomId(`ticket_close_direct_${ticket._id}`).setLabel('Fermer').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
  );

  const ping = config.staffRoleId
    ? fmt(msgs.staffPingMsg || '📢 {staff} — Nouvel exchange !', { staff: `<@&${config.staffRoleId}>` })
    : '';

  await channel.send({ content: `<@${interaction.user.id}>${ping ? ' ' + ping : ''}`, embeds: [embed], components: [row] });

  const openedMsg = fmt(msgs.ticketOpenedMsg || '✅ Ton ticket exchange a été créé : {channel}', { channel: `<#${channel.id}>` });
  await interaction.editReply({ content: openedMsg, components: [] });
};

const handleExchangeDone = async (interaction, ticketId) => {
  await interaction.deferUpdate();
  const config = await GuildConfig.findOne({ guildId: interaction.guildId });
  const msgs = config?.exchangeMessages || {};

  const oldEmbed = interaction.message.embeds[0];
  const fields = oldEmbed.fields.map(f => {
    if (f.name === (msgs.statusFieldName || '📊 Statut')) {
      return { name: f.name, value: msgs.statusCompleted || '✅ Exchange complété !', inline: f.inline };
    }
    return { name: f.name, value: f.value, inline: f.inline };
  });

  const newEmbed = EmbedBuilder.from(oldEmbed).setColor(0x2ECC71).setFields(...fields);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket_claim_${ticketId}`).setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('✋').setDisabled(true),
    new ButtonBuilder().setCustomId(`exc_ticket_done_${ticketId}`).setLabel('Complété').setStyle(ButtonStyle.Primary).setEmoji('✅').setDisabled(true),
    new ButtonBuilder().setCustomId(`exc_ticket_cancel_${ticketId}`).setLabel('Annuler').setStyle(ButtonStyle.Secondary).setEmoji('🚫').setDisabled(true),
    new ButtonBuilder().setCustomId(`ticket_close_direct_${ticketId}`).setLabel('Fermer').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
  );
  await interaction.message.edit({ embeds: [newEmbed], components: [row] });
  await interaction.followUp({ content: msgs.statusCompleted || '✅ Exchange marqué comme complété !', ephemeral: true });
};

const handleExchangeCancel = async (interaction, ticketId) => {
  await interaction.deferUpdate();
  const config = await GuildConfig.findOne({ guildId: interaction.guildId });
  const msgs = config?.exchangeMessages || {};

  const oldEmbed = interaction.message.embeds[0];
  const fields = oldEmbed.fields.map(f => {
    if (f.name === (msgs.statusFieldName || '📊 Statut')) {
      return { name: f.name, value: msgs.statusCancelled || '❌ Exchange annulé', inline: f.inline };
    }
    return { name: f.name, value: f.value, inline: f.inline };
  });

  const newEmbed = EmbedBuilder.from(oldEmbed).setColor(0xED4245).setFields(...fields);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket_claim_${ticketId}`).setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('✋').setDisabled(true),
    new ButtonBuilder().setCustomId(`exc_ticket_done_${ticketId}`).setLabel('Complété').setStyle(ButtonStyle.Primary).setEmoji('✅').setDisabled(true),
    new ButtonBuilder().setCustomId(`exc_ticket_cancel_${ticketId}`).setLabel('Annuler').setStyle(ButtonStyle.Secondary).setEmoji('🚫').setDisabled(true),
    new ButtonBuilder().setCustomId(`ticket_close_direct_${ticketId}`).setLabel('Fermer').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
  );
  await interaction.message.edit({ embeds: [newEmbed], components: [row] });
  await interaction.followUp({ content: msgs.statusCancelled || '❌ Exchange annulé.', ephemeral: true });
};

module.exports = {
  handleExchangePanelOpen,
  handleSelectFrom,
  handleSelectTo,
  handleAmountSubmit,
  handleExchangeDone,
  handleExchangeCancel,
};
