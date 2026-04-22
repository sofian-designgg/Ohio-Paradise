const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-template')
    .setDescription('Gérer les templates d\'embeds')
    .addSubcommand(sub =>
      sub.setName('list').setDescription('Lister les templates sauvegardés'))
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Supprimer un template')
        .addStringOption(opt => opt.setName('name').setDescription('Nom du template').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const config = await GuildConfig.findOne({ guildId: interaction.guildId });

    if (sub === 'list') {
      if (!config?.embedTemplates?.length) return interaction.editReply({ content: '📭 Aucun template sauvegardé.' });

      const embed = new EmbedBuilder()
        .setTitle('📋 Templates d\'embeds')
        .setColor(0x5865F2)
        .setDescription(config.embedTemplates.map((t, i) => `**${i + 1}.** ${t.name}`).join('\n'));

      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'delete') {
      const name = interaction.options.getString('name');
      const idx = config?.embedTemplates?.findIndex(t => t.name.toLowerCase() === name.toLowerCase());
      if (idx === -1 || idx === undefined) return interaction.editReply({ content: `❌ Template **${name}** introuvable.` });

      config.embedTemplates.splice(idx, 1);
      await config.save();
      return interaction.editReply({ content: `✅ Template **${name}** supprimé.` });
    }
  },
};
