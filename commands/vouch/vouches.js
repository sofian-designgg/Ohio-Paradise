const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Vouch = require('../../models/Vouch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouches')
    .setDescription('Voir les vouches d\'un membre')
    .addUserOption(opt => opt.setName('user').setDescription('Membre (vous-même par défaut)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const target = interaction.options.getUser('user') || interaction.user;
    const vouches = await Vouch.find({ guildId: interaction.guildId, targetId: target.id }).sort({ createdAt: -1 }).limit(10);
    const count = await Vouch.countDocuments({ guildId: interaction.guildId, targetId: target.id });

    const embed = new EmbedBuilder()
      .setTitle(`✅ Vouches — ${target.username}`)
      .setColor(0x2ECC71)
      .setThumbnail(target.displayAvatarURL())
      .addFields({ name: 'Total', value: `${count} vouch(es)`, inline: true })
      .setFooter({ text: 'Ohio Paradise' })
      .setTimestamp();

    if (vouches.length) {
      embed.setDescription(
        vouches.map(v => `• <@${v.authorId}>${v.comment ? ` — *${v.comment}*` : ''}`).join('\n')
      );
    } else {
      embed.setDescription('Aucun vouch reçu pour le moment.');
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
