const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('payment-show')
    .setDescription('Afficher une fiche de paiement')
    .addStringOption(opt =>
      opt.setName('method').setDescription('ID ou nom de la méthode de paiement').setRequired(true))
    .addUserOption(opt =>
      opt.setName('user').setDescription('Envoyer en DM à cet utilisateur (optionnel)').setRequired(false))
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Envoyer dans un channel (optionnel)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) return interaction.editReply({ content: '❌ Configuration introuvable.' });

    const methodInput = interaction.options.getString('method').toLowerCase();
    const method = config.paymentMethods.find(m =>
      m.id === methodInput || m.name.toLowerCase() === methodInput
    );

    if (!method) return interaction.editReply({ content: `❌ Méthode de paiement **${methodInput}** introuvable.` });
    if (!method.enabled) return interaction.editReply({ content: '❌ Cette méthode est désactivée.' });

    const color = method.color?.startsWith('#')
      ? parseInt(method.color.replace('#', ''), 16)
      : 0x2b2d31;

    const embed = new EmbedBuilder()
      .setTitle(`💳 Paiement — ${method.name}`)
      .setColor(color)
      .setFooter({ text: 'Ohio Paradise' })
      .setTimestamp();

    if (method.address) embed.addFields({ name: 'Adresse / Contact', value: `\`${method.address}\``, inline: false });
    if (method.instructions) embed.addFields({ name: 'Instructions', value: method.instructions, inline: false });
    if (method.note) embed.addFields({ name: '📝 Note', value: method.note, inline: false });
    if (method.qrUrl) embed.setImage(method.qrUrl);

    const targetUser = interaction.options.getUser('user');
    const targetChannel = interaction.options.getChannel('channel');

    if (targetUser) {
      try {
        await targetUser.send({ embeds: [embed] });
        return interaction.editReply({ content: `✅ Fiche envoyée en DM à <@${targetUser.id}>` });
      } catch {
        return interaction.editReply({ content: '❌ Impossible d\'envoyer le DM à cet utilisateur.' });
      }
    }

    if (targetChannel) {
      await targetChannel.send({ embeds: [embed] });
      return interaction.editReply({ content: `✅ Fiche envoyée dans <#${targetChannel.id}>` });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
