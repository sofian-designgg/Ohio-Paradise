const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Ticket = require('../../models/Ticket');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-add')
    .setDescription('Ajouter un membre au ticket')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Membre à ajouter').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const ticket = await Ticket.findOne({ channelId: interaction.channelId, guildId: interaction.guildId });
    if (!ticket) return interaction.editReply({ content: '❌ Ce channel n\'est pas un ticket.' });

    const user = interaction.options.getUser('user');
    await interaction.channel.permissionOverwrites.edit(user.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    await interaction.editReply({ content: `✅ <@${user.id}> ajouté au ticket.` });
  },
};
