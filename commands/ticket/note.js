const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Ticket = require('../../models/Ticket');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-note')
    .setDescription('Ajouter une note interne au ticket (invisible pour le client)')
    .addStringOption(opt =>
      opt.setName('note').setDescription('Contenu de la note').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const ticket = await Ticket.findOne({ channelId: interaction.channelId, guildId: interaction.guildId });
    if (!ticket) return interaction.editReply({ content: '❌ Ce channel n\'est pas un ticket.' });

    const note = interaction.options.getString('note');
    ticket.notes.push({ authorId: interaction.user.id, content: note });
    await ticket.save();

    await interaction.editReply({ content: `📝 Note ajoutée : *${note}*` });
  },
};
