const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');
const GuildConfig = require('../../models/GuildConfig');
const Ticket = require('../../models/Ticket');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dbtest')
    .setDescription('Teste la connexion à la base de données MongoDB')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const state = mongoose.connection.readyState;
    const stateMap = { 0: '❌ Déconnecté', 1: '✅ Connecté', 2: '🔄 Connexion...', 3: '🔄 Déconnexion...' };
    const stateText = stateMap[state] || '❓ Inconnu';

    if (state !== 1) {
      return interaction.editReply({ content: `**MongoDB :** ${stateText}\n\nLa base de données n'est pas connectée.` });
    }

    const start = Date.now();
    let configCount, ticketCount;

    try {
      [configCount, ticketCount] = await Promise.all([
        GuildConfig.countDocuments(),
        Ticket.countDocuments({ guildId: interaction.guildId }),
      ]);
    } catch (err) {
      return interaction.editReply({ content: `**MongoDB :** ${stateText}\n\n❌ Erreur lors de la requête : \`${err.message}\`` });
    }

    const ping = Date.now() - start;

    await interaction.editReply({
      content: [
        `**🗄️ Statut MongoDB :** ${stateText}`,
        `**⚡ Ping DB :** ${ping}ms`,
        `**📋 Configs guild :** ${configCount}`,
        `**🎫 Tickets ce serveur :** ${ticketCount}`,
      ].join('\n'),
    });
  },
};
