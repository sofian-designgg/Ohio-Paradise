const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-max-tickets')
    .setDescription('Définir le nombre maximum de tickets ouverts simultanément par utilisateur')
    .addIntegerOption(o => o
      .setName('max')
      .setDescription('Nombre maximum de tickets par personne (ex: 1, 2, 3...)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(10))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const max = interaction.options.getInteger('max');

    let config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) config = new GuildConfig({ guildId: interaction.guildId });

    config.maxTicketsPerUser = max;
    await config.save();

    await interaction.editReply({
      content: `✅ Maximum de tickets par utilisateur défini à **${max}**.\nChaque membre pourra avoir au maximum **${max} ticket${max > 1 ? 's' : ''}** ouvert${max > 1 ? 's' : ''} en même temps.`,
    });
  },
};
