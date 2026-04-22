const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const Order = require('../../models/Order');

const STATUS_MAP = {
  pending: { label: '🟡 En attente', color: 0xF1C40F },
  paid: { label: '🟢 Payé', color: 0x2ECC71 },
  delivered: { label: '✅ Livré', color: 0x57F287 },
  cancelled: { label: '🔴 Annulé', color: 0xED4245 },
  refunded: { label: '🔵 Remboursé', color: 0x3498DB },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('order-status')
    .setDescription('Mettre à jour le statut d\'une commande')
    .addStringOption(opt => opt.setName('order_id').setDescription('ID de la commande (ex: OP-ABC123)').setRequired(true))
    .addStringOption(opt =>
      opt.setName('status')
        .setDescription('Nouveau statut')
        .setRequired(true)
        .addChoices(
          { name: '🟡 En attente', value: 'pending' },
          { name: '🟢 Payé', value: 'paid' },
          { name: '✅ Livré', value: 'delivered' },
          { name: '🔴 Annulé', value: 'cancelled' },
          { name: '🔵 Remboursé', value: 'refunded' },
        ))
    .addStringOption(opt => opt.setName('note').setDescription('Note de changement').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const orderId = interaction.options.getString('order_id').toUpperCase();
    const newStatus = interaction.options.getString('status');
    const note = interaction.options.getString('note') || null;

    const order = await Order.findOne({ orderId, guildId: interaction.guildId });
    if (!order) return interaction.editReply({ content: `❌ Commande \`${orderId}\` introuvable.` });

    order.status = newStatus;
    order.statusHistory.push({ status: newStatus, changedBy: interaction.user.id, note });
    await order.save();

    const info = STATUS_MAP[newStatus];

    const embed = new EmbedBuilder()
      .setTitle(`📦 Statut mis à jour — \`${orderId}\``)
      .addFields(
        { name: 'Produit', value: order.product, inline: true },
        { name: 'Client', value: `<@${order.userId}>`, inline: true },
        { name: 'Nouveau statut', value: info.label, inline: true },
        ...(note ? [{ name: 'Note', value: note, inline: false }] : []),
      )
      .setColor(info.color)
      .setFooter({ text: `Mis à jour par ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    try {
      const user = await interaction.guild.members.fetch(order.userId);
      await user.send({ embeds: [embed] });
    } catch {}
  },
};
