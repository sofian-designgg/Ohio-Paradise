const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configurer le bot')
    .addSubcommand(sub =>
      sub.setName('set-log')
        .setDescription('Définir le channel de logs')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('set-staff-role')
        .setDescription('Définir le rôle Staff')
        .addRoleOption(opt => opt.setName('role').setDescription('Rôle').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('set-ticket-category')
        .setDescription('Définir la catégorie pour les tickets')
        .addChannelOption(opt => opt.setName('category').setDescription('Catégorie').addChannelTypes(ChannelType.GuildCategory).setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('set-review-channel')
        .setDescription('Définir le channel d\'avis')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('set-vouch-channel')
        .setDescription('Définir le channel de vouches')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('Voir la configuration actuelle'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    let config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) {
      config = new GuildConfig({ guildId: interaction.guildId });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'set-log') {
      config.logChannelId = interaction.options.getChannel('channel').id;
      await config.save();
      return interaction.editReply({ content: `✅ Channel de logs défini : <#${config.logChannelId}>` });
    }

    if (sub === 'set-staff-role') {
      config.staffRoleId = interaction.options.getRole('role').id;
      await config.save();
      return interaction.editReply({ content: `✅ Rôle staff défini : <@&${config.staffRoleId}>` });
    }

    if (sub === 'set-ticket-category') {
      config.ticketCategoryId = interaction.options.getChannel('category').id;
      await config.save();
      return interaction.editReply({ content: `✅ Catégorie tickets définie.` });
    }

    if (sub === 'set-review-channel') {
      config.reviewChannelId = interaction.options.getChannel('channel').id;
      await config.save();
      return interaction.editReply({ content: `✅ Channel d'avis défini : <#${config.reviewChannelId}>` });
    }

    if (sub === 'set-vouch-channel') {
      config.vouchChannelId = interaction.options.getChannel('channel').id;
      await config.save();
      return interaction.editReply({ content: `✅ Channel vouches défini : <#${config.vouchChannelId}>` });
    }

    if (sub === 'view') {
      const embed = new EmbedBuilder()
        .setTitle('⚙️ Configuration — Ohio Paradise')
        .setColor(0x5865F2)
        .addFields(
          { name: 'Log Channel', value: config.logChannelId ? `<#${config.logChannelId}>` : 'Non défini', inline: true },
          { name: 'Staff Role', value: config.staffRoleId ? `<@&${config.staffRoleId}>` : 'Non défini', inline: true },
          { name: 'Ticket Category', value: config.ticketCategoryId ? `<#${config.ticketCategoryId}>` : 'Non défini', inline: true },
          { name: 'Review Channel', value: config.reviewChannelId ? `<#${config.reviewChannelId}>` : 'Non défini', inline: true },
          { name: 'Vouch Channel', value: config.vouchChannelId ? `<#${config.vouchChannelId}>` : 'Non défini', inline: true },
          { name: 'Payment Methods', value: `${config.paymentMethods.length} configurées`, inline: true },
          { name: 'Frais Exchange', value: `${config.exchangeConfig?.feePercent ?? 5}%`, inline: true },
        )
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }
  },
};
