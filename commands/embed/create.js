const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');
const { v4: uuidv4 } = require('crypto');

const buildPreviewEmbed = (data) => {
  const color = data.color?.startsWith('#')
    ? parseInt(data.color.replace('#', ''), 16)
    : 0x5865F2;

  const embed = new EmbedBuilder().setColor(color);
  if (data.title) embed.setTitle(data.title);
  if (data.description) embed.setDescription(data.description);
  if (data.footer) embed.setFooter({ text: data.footer });
  if (data.thumbnailUrl) embed.setThumbnail(data.thumbnailUrl);
  if (data.imageUrl) embed.setImage(data.imageUrl);
  if (data.fields?.length) {
    for (const f of data.fields) {
      if (f.name && f.value) embed.addFields({ name: f.name, value: f.value, inline: f.inline || false });
    }
  }
  return embed;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-create')
    .setDescription('Créer et envoyer un embed personnalisé')
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel de destination')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .addStringOption(opt => opt.setName('title').setDescription('Titre').setRequired(false))
    .addStringOption(opt => opt.setName('description').setDescription('Description').setRequired(false))
    .addStringOption(opt => opt.setName('color').setDescription('Couleur hex (#RRGGBB)').setRequired(false))
    .addStringOption(opt => opt.setName('footer').setDescription('Footer').setRequired(false))
    .addStringOption(opt => opt.setName('thumbnail').setDescription('URL thumbnail').setRequired(false))
    .addStringOption(opt => opt.setName('image').setDescription('URL image principale').setRequired(false))
    .addStringOption(opt => opt.setName('template').setDescription('Nom d\'un template sauvegardé').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel');
    const config = await GuildConfig.findOne({ guildId: interaction.guildId });

    let embedData = {
      title: null, description: null, color: '#5865F2',
      footer: null, thumbnailUrl: null, imageUrl: null, fields: [],
    };

    const templateName = interaction.options.getString('template');
    if (templateName && config) {
      const tmpl = config.embedTemplates.find(t => t.name.toLowerCase() === templateName.toLowerCase());
      if (tmpl) embedData = { ...embedData, ...tmpl.embed };
    }

    if (interaction.options.getString('title')) embedData.title = interaction.options.getString('title');
    if (interaction.options.getString('description')) embedData.description = interaction.options.getString('description');
    if (interaction.options.getString('color')) embedData.color = interaction.options.getString('color');
    if (interaction.options.getString('footer')) embedData.footer = interaction.options.getString('footer');
    if (interaction.options.getString('thumbnail')) embedData.thumbnailUrl = interaction.options.getString('thumbnail');
    if (interaction.options.getString('image')) embedData.imageUrl = interaction.options.getString('image');

    const preview = buildPreviewEmbed(embedData);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`embed_send_${channel.id}`).setLabel('Envoyer').setStyle(ButtonStyle.Success).setEmoji('📤'),
      new ButtonBuilder().setCustomId(`embed_save_template`).setLabel('Sauvegarder template').setStyle(ButtonStyle.Primary).setEmoji('💾'),
      new ButtonBuilder().setCustomId(`embed_cancel`).setLabel('Annuler').setStyle(ButtonStyle.Secondary),
    );

    interaction.client._pendingEmbeds = interaction.client._pendingEmbeds || new Map();
    interaction.client._pendingEmbeds.set(interaction.user.id, { embedData, channelId: channel.id });

    await interaction.editReply({
      content: '👀 **Prévisualisation de l\'embed** — Vérifie avant d\'envoyer :',
      embeds: [preview],
      components: [row],
    });
  },
};
