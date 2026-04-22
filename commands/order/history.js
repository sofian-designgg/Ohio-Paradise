const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Order = require('../../models/Order');

const STATUS_EMOJI = {
  pending: '🟡',
  paid: '🟢',
  delivered: '✅',
  cancelled: '🔴',
  refunded: '🔵',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('order-history')
    .setDescription('Voir l\'historique des commandes d\'un utilisateur')
    .addUserOption(opt => opt.setName('user').setDescription('Utilisateur (vous-même par défaut)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('user') || interaction.user;
    const orders = await Order.find({ guildId: interaction.guildId, userId: target.id }).sort({ createdAt: -1 }).limit(10);

    if (!orders.length) return interaction.editReply({ content: `📭 Aucune commande trouvée pour <@${target.id}>` });

    const embed = new EmbedBuilder()
      .setTitle(`📦 Historique — ${target.username}`)
      .setColor(0x5865F2)
      .setThumbnail(target.displayAvatarURL())
      .setDescription(
        orders.map(o =>
          `${STATUS_EMOJI[o.status] || '⚪'} \`${o.orderId}\` — **${o.product}** | ${o.amount ? `${o.amount} ${o.currency}` : 'N/A'}`
        ).join('\n')
      )
      .setFooter({ text: `${orders.length} commande(s) affichée(s)` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
