const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Envoyer le panneau de tickets dans un channel')
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel où envoyer le panneau')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel');
    let config = await GuildConfig.findOne({ guildId: interaction.guildId });

    if (!config) {
      config = new GuildConfig({ guildId: interaction.guildId });
      await config.save();
    }

    const panel = config.ticketPanel;

    if (!panel.buttons || panel.buttons.length === 0) {
      return interaction.editReply({ content: '❌ Aucun bouton configuré. Configure le panneau depuis le Dashboard HTML d\'abord.' });
    }

    const hexColor = panel.embed.color?.startsWith('#')
      ? parseInt(panel.embed.color.replace('#', ''), 16)
      : 0x5865F2;

    const embed = new EmbedBuilder()
      .setTitle(panel.embed.title || 'Support')
      .setDescription(panel.embed.description || 'Ouvre un ticket.')
      .setColor(hexColor)
      .setFooter({ text: panel.embed.footer || 'Ohio Paradise' });

    if (panel.embed.thumbnailUrl) embed.setThumbnail(panel.embed.thumbnailUrl);
    if (panel.embed.imageUrl) embed.setImage(panel.embed.imageUrl);

    const rows = [];
    let currentRow = new ActionRowBuilder();
    let count = 0;

    for (const btn of panel.buttons) {
      if (count > 0 && count % 5 === 0) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
      }

      const styleMap = {
        Primary: ButtonStyle.Primary,
        Secondary: ButtonStyle.Secondary,
        Success: ButtonStyle.Success,
        Danger: ButtonStyle.Danger,
      };

      const button = new ButtonBuilder()
        .setCustomId(`ticket_open_${btn.id}`)
        .setLabel(btn.label)
        .setStyle(styleMap[btn.style] || ButtonStyle.Primary);

      if (btn.emoji) button.setEmoji(btn.emoji);
      currentRow.addComponents(button);
      count++;
    }

    if (count % 5 !== 0 || count === 0) rows.push(currentRow);

    const msg = await channel.send({ embeds: [embed], components: rows });

    config.ticketPanel.channelId = channel.id;
    config.ticketPanel.messageId = msg.id;
    await config.save();

    await interaction.editReply({ content: `✅ Panneau envoyé dans <#${channel.id}>` });
  },
};
