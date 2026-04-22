const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Order = require('../../models/Order');
const { randomUUID } = require('crypto');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('order-create')
    .setDescription('Créer une commande pour un client')
    .addUserOption(opt => opt.setName('user').setDescription('Client').setRequired(true))
    .addStringOption(opt => opt.setName('product').setDescription('Produit / service').setRequired(true))
    .addNumberOption(opt => opt.setName('amount').setDescription('Montant').setRequired(false))
    .addStringOption(opt => opt.setName('currency').setDescription('Devise (EUR, USD, LTC...)').setRequired(false))
    .addStringOption(opt => opt.setName('payment').setDescription('Méthode de paiement').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser('user');
    const product = interaction.options.getString('product');
    const amount = interaction.options.getNumber('amount') || 0;
    const currency = interaction.options.getString('currency')?.toUpperCase() || 'EUR';
    const paymentMethod = interaction.options.getString('payment') || null;

    const orderId = `OP-${Date.now().toString(36).toUpperCase()}`;

    const order = new Order({
      guildId: interaction.guildId,
      orderId,
      userId: user.id,
      staffId: interaction.user.id,
      ticketChannelId: interaction.channelId,
      product,
      amount,
      currency,
      paymentMethod,
      status: 'pending',
      statusHistory: [{ status: 'pending', changedBy: interaction.user.id }],
    });
    await order.save();

    const embed = new EmbedBuilder()
      .setTitle(`📦 Commande créée — \`${orderId}\``)
      .addFields(
        { name: 'Client', value: `<@${user.id}>`, inline: true },
        { name: 'Produit', value: product, inline: true },
        { name: 'Montant', value: amount ? `${amount} ${currency}` : 'Non défini', inline: true },
        { name: 'Paiement', value: paymentMethod || 'Non défini', inline: true },
        { name: 'Statut', value: '🟡 En attente', inline: true },
      )
      .setColor(0xF1C40F)
      .setFooter({ text: `Staff: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    await interaction.channel.send({ embeds: [embed] });
  },
};
