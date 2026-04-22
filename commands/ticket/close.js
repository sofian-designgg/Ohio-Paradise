const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Ticket = require('../../models/Ticket');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-close')
    .setDescription('Fermer le ticket actuel')
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Raison de la fermeture')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const ticket = await Ticket.findOne({ channelId: interaction.channelId, guildId: interaction.guildId });
    if (!ticket) return interaction.editReply({ content: '❌ Ce channel n\'est pas un ticket.' });
    if (ticket.status === 'closed') return interaction.editReply({ content: '❌ Ce ticket est déjà fermé.' });

    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    const reason = interaction.options.getString('reason') || 'Aucune raison fournie';

    const embed = new EmbedBuilder()
      .setTitle('🔒 Fermeture du ticket')
      .setDescription(`Ce ticket va être fermé dans **5 secondes**.\n**Raison :** ${reason}`)
      .setColor(0xED4245)
      .setFooter({ text: `Fermé par ${interaction.user.tag}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_confirm_close_${ticket._id}`)
        .setLabel('Confirmer la fermeture')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`ticket_cancel_close_${ticket._id}`)
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};
