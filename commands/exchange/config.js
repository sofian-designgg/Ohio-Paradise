const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('exchange-config')
    .setDescription('Configurer le système d\'exchange')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(sub => sub
      .setName('frais')
      .setDescription('Définir les frais globaux d\'exchange')
      .addNumberOption(o => o.setName('pourcentage').setDescription('Frais en % (ex: 5)').setRequired(true).setMinValue(0).setMaxValue(50)))

    .addSubcommand(sub => sub
      .setName('limites')
      .setDescription('Définir les montants min/max')
      .addNumberOption(o => o.setName('min').setDescription('Montant minimum').setRequired(true))
      .addNumberOption(o => o.setName('max').setDescription('Montant maximum').setRequired(true)))

    .addSubcommand(sub => sub
      .setName('paire')
      .setDescription('Activer ou désactiver une paire d\'échange')
      .addStringOption(o => o.setName('paire').setDescription('ex: LTC_PAYPAL').setRequired(true))
      .addStringOption(o => o.setName('action').setDescription('activer ou désactiver').setRequired(true).addChoices(
        { name: '✅ Activer', value: 'enable' },
        { name: '❌ Désactiver', value: 'disable' },
      )))

    .addSubcommand(sub => sub
      .setName('panneau-titre')
      .setDescription('Titre de l\'embed du panneau exchange')
      .addStringOption(o => o.setName('titre').setDescription('Titre').setRequired(true)))

    .addSubcommand(sub => sub
      .setName('panneau-description')
      .setDescription('Description de l\'embed du panneau exchange')
      .addStringOption(o => o.setName('description').setDescription('Description').setRequired(true)))

    .addSubcommand(sub => sub
      .setName('panneau-couleur')
      .setDescription('Couleur de l\'embed du panneau exchange')
      .addStringOption(o => o.setName('couleur').setDescription('Couleur hex ex: #F1C40F').setRequired(true)))

    .addSubcommand(sub => sub
      .setName('ticket-titre')
      .setDescription('Titre de l\'embed ticket exchange')
      .addStringOption(o => o.setName('titre').setDescription('Variables: {from} {to}').setRequired(true)))

    .addSubcommand(sub => sub
      .setName('ticket-description')
      .setDescription('Description de l\'embed ticket exchange')
      .addStringOption(o => o.setName('description').setDescription('Variables: {user} {from} {to} {amount} {result}').setRequired(true)))

    .addSubcommand(sub => sub
      .setName('ticket-footer')
      .setDescription('Footer de l\'embed ticket exchange')
      .addStringOption(o => o.setName('footer').setDescription('Variables: {date}').setRequired(true)))

    .addSubcommand(sub => sub
      .setName('message-ouverture')
      .setDescription('Message éphémère envoyé quand un ticket est créé')
      .addStringOption(o => o.setName('message').setDescription('Variables: {channel}').setRequired(true)))

    .addSubcommand(sub => sub
      .setName('message-deja-ouvert')
      .setDescription('Message si l\'utilisateur a déjà un ticket exchange ouvert')
      .addStringOption(o => o.setName('message').setDescription('Variables: {channel}').setRequired(true)))

    .addSubcommand(sub => sub
      .setName('statut-attente')
      .setDescription('Texte du statut "En attente"')
      .addStringOption(o => o.setName('texte').setDescription('Texte').setRequired(true)))

    .addSubcommand(sub => sub
      .setName('statut-complete')
      .setDescription('Texte du statut "Complété"')
      .addStringOption(o => o.setName('texte').setDescription('Texte').setRequired(true)))

    .addSubcommand(sub => sub
      .setName('statut-annule')
      .setDescription('Texte du statut "Annulé"')
      .addStringOption(o => o.setName('texte').setDescription('Texte').setRequired(true)))

    .addSubcommand(sub => sub
      .setName('voir')
      .setDescription('Voir la configuration exchange actuelle')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    let config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) config = new GuildConfig({ guildId: interaction.guildId });
    if (!config.exchangeConfig) config.exchangeConfig = {};
    if (!config.exchangeTicketPanel) config.exchangeTicketPanel = { embed: {} };
    if (!config.exchangeTicketPanel.embed) config.exchangeTicketPanel.embed = {};
    if (!config.exchangeMessages) config.exchangeMessages = {};

    let changed = '';

    if (sub === 'frais') {
      const pct = interaction.options.getNumber('pourcentage');
      config.exchangeConfig.feePercent = pct;
      changed = `Frais globaux → **${pct}%**`;
    }

    else if (sub === 'limites') {
      const min = interaction.options.getNumber('min');
      const max = interaction.options.getNumber('max');
      if (min >= max) return interaction.editReply({ content: '❌ Le minimum doit être inférieur au maximum.' });
      config.exchangeConfig.minAmount = min;
      config.exchangeConfig.maxAmount = max;
      changed = `Limites → min **${min}** / max **${max}**`;
    }

    else if (sub === 'paire') {
      const paire = interaction.options.getString('paire').toUpperCase();
      const action = interaction.options.getString('action');
      if (!config.exchangeConfig.activePairs) config.exchangeConfig.activePairs = [];
      if (action === 'enable') {
        if (!config.exchangeConfig.activePairs.includes(paire)) config.exchangeConfig.activePairs.push(paire);
        changed = `Paire **${paire}** → ✅ Activée`;
      } else {
        config.exchangeConfig.activePairs = config.exchangeConfig.activePairs.filter(p => p !== paire);
        changed = `Paire **${paire}** → ❌ Désactivée`;
      }
    }

    else if (sub === 'panneau-titre') {
      config.exchangeTicketPanel.embed.title = interaction.options.getString('titre');
      changed = `Titre panneau → **${config.exchangeTicketPanel.embed.title}**`;
    }

    else if (sub === 'panneau-description') {
      config.exchangeTicketPanel.embed.description = interaction.options.getString('description');
      changed = `Description panneau mise à jour`;
    }

    else if (sub === 'panneau-couleur') {
      const c = interaction.options.getString('couleur');
      if (!/^#[0-9A-Fa-f]{6}$/.test(c)) return interaction.editReply({ content: '❌ Format invalide. Utilise une couleur hex : `#F1C40F`' });
      config.exchangeTicketPanel.embed.color = c;
      changed = `Couleur panneau → **${c}**`;
    }

    else if (sub === 'ticket-titre') {
      config.exchangeMessages.welcomeTitle = interaction.options.getString('titre');
      changed = `Titre ticket → **${config.exchangeMessages.welcomeTitle}**`;
    }

    else if (sub === 'ticket-description') {
      config.exchangeMessages.welcomeDescription = interaction.options.getString('description');
      changed = `Description ticket mise à jour`;
    }

    else if (sub === 'ticket-footer') {
      config.exchangeMessages.welcomeFooter = interaction.options.getString('footer');
      changed = `Footer ticket → **${config.exchangeMessages.welcomeFooter}**`;
    }

    else if (sub === 'message-ouverture') {
      config.exchangeMessages.ticketOpenedMsg = interaction.options.getString('message');
      changed = `Message ouverture → **${config.exchangeMessages.ticketOpenedMsg}**`;
    }

    else if (sub === 'message-deja-ouvert') {
      config.exchangeMessages.alreadyOpenMsg = interaction.options.getString('message');
      changed = `Message déjà ouvert → **${config.exchangeMessages.alreadyOpenMsg}**`;
    }

    else if (sub === 'statut-attente') {
      config.exchangeMessages.statusPending = interaction.options.getString('texte');
      changed = `Statut attente → **${config.exchangeMessages.statusPending}**`;
    }

    else if (sub === 'statut-complete') {
      config.exchangeMessages.statusCompleted = interaction.options.getString('texte');
      changed = `Statut complété → **${config.exchangeMessages.statusCompleted}**`;
    }

    else if (sub === 'statut-annule') {
      config.exchangeMessages.statusCancelled = interaction.options.getString('texte');
      changed = `Statut annulé → **${config.exchangeMessages.statusCancelled}**`;
    }

    else if (sub === 'voir') {
      const exc = config.exchangeConfig || {};
      const msgs = config.exchangeMessages || {};
      const panel = config.exchangeTicketPanel?.embed || {};
      const embed = new EmbedBuilder()
        .setTitle('💱 Configuration Exchange')
        .setColor(0x5865F2)
        .addFields(
          { name: '⚙️ Frais globaux', value: `${exc.feePercent ?? 5}%`, inline: true },
          { name: '📉 Min', value: `${exc.minAmount ?? 5}`, inline: true },
          { name: '📈 Max', value: `${exc.maxAmount ?? 5000}`, inline: true },
          { name: '🔗 Paires actives', value: (exc.activePairs?.join(', ') || '—').substring(0, 1024) },
          { name: '🖼️ Titre panneau', value: panel.title || '(défaut)', inline: true },
          { name: '🎨 Couleur', value: panel.color || '(défaut)', inline: true },
          { name: '📩 Titre ticket', value: msgs.welcomeTitle || '(défaut)', inline: true },
          { name: '⏳ Statut attente', value: msgs.statusPending || '(défaut)', inline: true },
          { name: '✅ Statut complété', value: msgs.statusCompleted || '(défaut)', inline: true },
          { name: '❌ Statut annulé', value: msgs.statusCancelled || '(défaut)', inline: true },
        )
        .setFooter({ text: 'Ohio Paradise Exchange Config' });
      return interaction.editReply({ embeds: [embed] });
    }

    config.markModified('exchangeConfig');
    config.markModified('exchangeTicketPanel');
    config.markModified('exchangeMessages');
    await config.save();

    return interaction.editReply({ content: `✅ ${changed}` });
  },
};
