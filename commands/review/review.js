const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Review = require('../../models/Review');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('review')
    .setDescription('Laisser un avis sur votre achat')
    .addIntegerOption(opt =>
      opt.setName('stars').setDescription('Note de 1 à 5 étoiles').setMinValue(1).setMaxValue(5).setRequired(true))
    .addStringOption(opt =>
      opt.setName('comment').setDescription('Commentaire (optionnel)').setRequired(false))
    .addStringOption(opt =>
      opt.setName('order_id').setDescription('ID de commande (optionnel)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const stars = interaction.options.getInteger('stars');
    const comment = interaction.options.getString('comment') || null;
    const orderId = interaction.options.getString('order_id') || null;

    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    const reviewChannelId = config?.reviewChannelId;

    const starsDisplay = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);

    const reviewEmbed = new EmbedBuilder()
      .setTitle('⭐ Nouvel Avis')
      .setDescription(comment || '*Aucun commentaire*')
      .addFields(
        { name: 'Note', value: starsDisplay, inline: true },
        { name: 'Auteur', value: `<@${interaction.user.id}>`, inline: true },
        ...(orderId ? [{ name: 'Commande', value: orderId, inline: true }] : []),
      )
      .setColor(stars >= 4 ? 0x2ECC71 : stars === 3 ? 0xF1C40F : 0xED4245)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: 'Ohio Paradise' })
      .setTimestamp();

    const review = new Review({
      guildId: interaction.guildId,
      userId: interaction.user.id,
      stars,
      comment,
      orderId,
      ticketChannelId: interaction.channelId,
    });

    if (reviewChannelId) {
      const reviewChannel = interaction.guild.channels.cache.get(reviewChannelId);
      if (reviewChannel) {
        const msg = await reviewChannel.send({ embeds: [reviewEmbed] });
        review.messageId = msg.id;
      }
    }

    await review.save();
    await interaction.editReply({ content: `✅ Merci pour ton avis **${starsDisplay}** !` });
  },
};
