const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-import')
    .setDescription('Importer une configuration générée depuis le Dashboard HTML')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Type de configuration à importer')
        .setRequired(true)
        .addChoices(
          { name: '🎫 Panneau Tickets', value: 'ticket_panel' },
          { name: '💱 Exchange', value: 'exchange' },
          { name: '🎫 Panneau Exchange Ticket', value: 'exchange_panel' },
          { name: '💳 Méthode de paiement', value: 'payment_method' },
          { name: '✅ Paliers Vouches', value: 'vouch_roles' },
          { name: '⚙️ Config générale', value: 'general' },
        ))
    .addStringOption(opt =>
      opt.setName('data')
        .setDescription('JSON généré par le Dashboard (colle-le ici)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const type = interaction.options.getString('type');
    const rawData = interaction.options.getString('data');

    let parsed;
    try {
      parsed = JSON.parse(rawData);
    } catch {
      return interaction.editReply({ content: '❌ JSON invalide. Génère-le depuis le Dashboard HTML.' });
    }

    let config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) config = new GuildConfig({ guildId: interaction.guildId });

    const fields = [];

    if (type === 'ticket_panel') {
      if (parsed.embed) config.ticketPanel.embed = { ...config.ticketPanel.embed, ...parsed.embed };
      if (parsed.buttons) config.ticketPanel.buttons = parsed.buttons;
      fields.push(
        { name: 'Titre', value: parsed.embed?.title || '—', inline: true },
        { name: 'Couleur', value: parsed.embed?.color || '—', inline: true },
        { name: 'Boutons', value: `${parsed.buttons?.length || 0} bouton(s)`, inline: true },
      );
    }

    else if (type === 'exchange_panel') {
      if (parsed.embed) config.exchangeTicketPanel.embed = { ...config.exchangeTicketPanel.embed, ...parsed.embed };
      if (parsed.messages) config.exchangeMessages = { ...config.exchangeMessages?.toObject?.() || {}, ...parsed.messages };
      fields.push(
        { name: 'Titre panneau', value: parsed.embed?.title || '—', inline: true },
        { name: 'Couleur', value: parsed.embed?.color || '—', inline: true },
        { name: 'Messages', value: `${Object.keys(parsed.messages || {}).length} message(s)`, inline: true },
      );
    }

    else if (type === 'exchange') {
      config.exchangeConfig = {
        feePercent: parsed.feePercent ?? config.exchangeConfig?.feePercent ?? 5,
        minAmount: parsed.minAmount ?? config.exchangeConfig?.minAmount ?? 5,
        maxAmount: parsed.maxAmount ?? config.exchangeConfig?.maxAmount ?? 5000,
        activePairs: parsed.activePairs ?? config.exchangeConfig?.activePairs ?? [],
        customFees: parsed.customFees ?? config.exchangeConfig?.customFees ?? {},
      };
      fields.push(
        { name: 'Frais', value: `${config.exchangeConfig.feePercent}%`, inline: true },
        { name: 'Min / Max', value: `${config.exchangeConfig.minAmount} / ${config.exchangeConfig.maxAmount}`, inline: true },
        { name: 'Paires actives', value: `${config.exchangeConfig.activePairs.length}`, inline: true },
      );
    }

    else if (type === 'payment_method') {
      const methods = Array.isArray(parsed) ? parsed : [parsed];
      for (const method of methods) {
        const idx = config.paymentMethods.findIndex(m => m.id === method.id);
        if (idx !== -1) config.paymentMethods[idx] = method;
        else config.paymentMethods.push(method);
      }
      fields.push({ name: 'Méthodes importées', value: `${methods.length}`, inline: true });
    }

    else if (type === 'vouch_roles') {
      config.vouchRoles = Array.isArray(parsed) ? parsed : [];
      fields.push({ name: 'Paliers configurés', value: `${config.vouchRoles.length}`, inline: true });
    }

    else if (type === 'general') {
      if (parsed.logChannelId) config.logChannelId = parsed.logChannelId;
      if (parsed.staffRoleId) config.staffRoleId = parsed.staffRoleId;
      if (parsed.ticketCategoryId) config.ticketCategoryId = parsed.ticketCategoryId;
      if (parsed.reviewChannelId) config.reviewChannelId = parsed.reviewChannelId;
      if (parsed.vouchChannelId) config.vouchChannelId = parsed.vouchChannelId;
      if (parsed.announcementChannelId) config.announcementChannelId = parsed.announcementChannelId;
      fields.push(
        { name: 'Log Channel', value: config.logChannelId ? `<#${config.logChannelId}>` : '—', inline: true },
        { name: 'Staff Role', value: config.staffRoleId ? `<@&${config.staffRoleId}>` : '—', inline: true },
      );
    }

    config.markModified('ticketPanel');
    config.markModified('exchangeConfig');
    config.markModified('exchangeTicketPanel');
    config.markModified('exchangeMessages');
    config.markModified('paymentMethods');
    config.markModified('vouchRoles');
    await config.save();

    const typeLabels = {
      ticket_panel: '🎫 Panneau Tickets',
      exchange: '💱 Exchange',
      exchange_panel: '🎫 Panneau Exchange Ticket',
      payment_method: '💳 Méthode de paiement',
      vouch_roles: '✅ Paliers Vouches',
      general: '⚙️ Config générale',
    };

    const embed = new EmbedBuilder()
      .setTitle(`✅ Configuration importée — ${typeLabels[type]}`)
      .setColor(0x2ECC71)
      .addFields(...fields)
      .setFooter({ text: `Importé par ${interaction.user.tag} • Ohio Paradise` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
