const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Ticket = require('../../models/Ticket');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-remove')
    .setDescription('Retirer un membre du ticket')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Membre à retirer').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const ticket = await Ticket.findOne({ channelId: interaction.channelId, guildId: interaction.guildId });
    if (!ticket) return interaction.editReply({ content: '❌ Ce channel n\'est pas un ticket.' });

    const user = interaction.options.getUser('user');
    await interaction.channel.permissionOverwrites.edit(user.id, {
      ViewChannel: false,
    });

    await interaction.editReply({ content: `✅ <@${user.id}> retiré du ticket.` });
  },
};
