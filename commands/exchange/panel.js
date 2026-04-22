const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('exchange-panel')
    .setDescription('Déployer le panneau d\'exchange interactif dans un channel')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel où envoyer le panneau').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel');
    let config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) config = new GuildConfig({ guildId: interaction.guildId });

    const panelCfg = config.exchangeTicketPanel?.embed || {};
    const color = panelCfg.color || '#F1C40F';
    const colorInt = parseInt(color.replace('#', ''), 16) || 0xF1C40F;

    const embed = new EmbedBuilder()
      .setTitle(panelCfg.title || '💱 Exchange — Ohio Paradise')
      .setDescription(panelCfg.description || 'Sélectionne la crypto que tu envoies et celle que tu reçois pour ouvrir un ticket d\'exchange.')
      .setColor(colorInt)
      .setFooter({ text: panelCfg.footer || 'Ohio Paradise Exchange' })
      .setTimestamp();

    if (panelCfg.thumbnailUrl) embed.setThumbnail(panelCfg.thumbnailUrl);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('exc_panel_open')
        .setLabel('💱 Ouvrir un Exchange')
        .setStyle(ButtonStyle.Primary),
    );

    const msg = await channel.send({ embeds: [embed], components: [row] });

    config.exchangeTicketPanel.channelId = channel.id;
    config.exchangeTicketPanel.messageId = msg.id;
    await config.save();

    await interaction.editReply({ content: `✅ Panneau exchange déployé dans <#${channel.id}> !` });
  },
};
