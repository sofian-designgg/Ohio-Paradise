const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const Announcement = require('../../models/Announcement');
const cron = require('node-cron');

const scheduleAnnouncement = (client, announcement) => {
  if (!announcement.cronExpression || !cron.validate(announcement.cronExpression)) return;

  const job = cron.schedule(announcement.cronExpression, async () => {
    try {
      const guild = client.guilds.cache.values().next().value;
      if (!guild) return;
      const channel = guild.channels.cache.get(announcement.channelId);
      if (!channel) return;

      const embed = new EmbedBuilder(announcement.embed);
      await channel.send({ embeds: [embed] });

      announcement.lastSentAt = new Date();
      await announcement.save();
    } catch (err) {
      console.error('[Announce] Cron error:', err);
    }
  });

  client._cronJobs = client._cronJobs || new Map();
  client._cronJobs.set(announcement._id.toString(), job);
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Envoyer ou planifier une annonce embed')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel de destination').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption(opt => opt.setName('title').setDescription('Titre de l\'annonce').setRequired(true))
    .addStringOption(opt => opt.setName('description').setDescription('Description').setRequired(true))
    .addStringOption(opt => opt.setName('color').setDescription('Couleur hex (#RRGGBB)').setRequired(false))
    .addStringOption(opt => opt.setName('image').setDescription('URL image').setRequired(false))
    .addStringOption(opt => opt.setName('cron').setDescription('Expression cron pour répétition (ex: 0 9 * * 1)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const colorHex = interaction.options.getString('color') || '#5865F2';
    const imageUrl = interaction.options.getString('image') || null;
    const cronExpr = interaction.options.getString('cron') || null;

    if (cronExpr && !cron.validate(cronExpr)) {
      return interaction.editReply({ content: '❌ Expression cron invalide. Ex: `0 9 * * 1` (lundi 9h)' });
    }

    const color = colorHex.startsWith('#') ? parseInt(colorHex.replace('#', ''), 16) : 0x5865F2;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setFooter({ text: 'Ohio Paradise' })
      .setTimestamp();

    if (imageUrl) embed.setImage(imageUrl);

    if (!cronExpr) {
      await channel.send({ embeds: [embed] });
      return interaction.editReply({ content: `✅ Annonce envoyée dans <#${channel.id}>` });
    }

    const announcement = new Announcement({
      guildId: interaction.guildId,
      channelId: channel.id,
      cronExpression: cronExpr,
      embed: embed.toJSON(),
      active: true,
    });
    await announcement.save();

    scheduleAnnouncement(interaction.client, announcement);

    return interaction.editReply({ content: `✅ Annonce planifiée dans <#${channel.id}> avec cron \`${cronExpr}\`` });
  },

  scheduleAnnouncement,
};
