const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Vouch = require('../../models/Vouch');
const GuildConfig = require('../../models/GuildConfig');

const checkAndAssignRoles = async (guild, targetId, config) => {
  if (!config?.vouchRoles?.length) return;

  const count = await Vouch.countDocuments({ guildId: guild.id, targetId });
  const member = await guild.members.fetch(targetId).catch(() => null);
  if (!member) return;

  const sorted = config.vouchRoles.sort((a, b) => b.threshold - a.threshold);
  for (const vr of sorted) {
    if (count >= vr.threshold) {
      const role = guild.roles.cache.get(vr.roleId);
      if (role && !member.roles.cache.has(vr.roleId)) {
        await member.roles.add(role).catch(() => {});
      }
      break;
    }
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouch')
    .setDescription('Laisser un vouch à un membre')
    .addUserOption(opt => opt.setName('user').setDescription('Membre à voucher').setRequired(true))
    .addStringOption(opt => opt.setName('comment').setDescription('Commentaire').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('user');
    const comment = interaction.options.getString('comment') || null;

    if (target.id === interaction.user.id) return interaction.editReply({ content: '❌ Tu ne peux pas te voucher toi-même.' });

    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    const vouchChannelId = config?.vouchChannelId;

    const count = await Vouch.countDocuments({ guildId: interaction.guildId, targetId: target.id });

    const embed = new EmbedBuilder()
      .setTitle('✅ Vouch')
      .setDescription(comment || '*Aucun commentaire*')
      .addFields(
        { name: 'Pour', value: `<@${target.id}>`, inline: true },
        { name: 'Par', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Total vouches', value: `${count + 1}`, inline: true },
      )
      .setColor(0x2ECC71)
      .setThumbnail(target.displayAvatarURL())
      .setFooter({ text: 'Ohio Paradise' })
      .setTimestamp();

    const vouch = new Vouch({
      guildId: interaction.guildId,
      targetId: target.id,
      authorId: interaction.user.id,
      comment,
    });

    if (vouchChannelId) {
      const vouchChannel = interaction.guild.channels.cache.get(vouchChannelId);
      if (vouchChannel) {
        const msg = await vouchChannel.send({ embeds: [embed] });
        vouch.messageId = msg.id;
      }
    }

    await vouch.save();
    await checkAndAssignRoles(interaction.guild, target.id, config);
    await interaction.editReply({ content: `✅ Vouch laissé pour <@${target.id}> !` });
  },
};
