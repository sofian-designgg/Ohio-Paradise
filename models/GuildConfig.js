const { Schema, model } = require('mongoose');

const GuildConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  logChannelId: { type: String, default: null },
  staffRoleId: { type: String, default: null },
  ticketCategoryId: { type: String, default: null },
  reviewChannelId: { type: String, default: null },
  vouchChannelId: { type: String, default: null },
  announcementChannelId: { type: String, default: null },

  ticketPanel: {
    channelId: { type: String, default: null },
    messageId: { type: String, default: null },
    embed: {
      title: { type: String, default: 'Support & Achats' },
      description: { type: String, default: 'Clique sur un bouton ci-dessous pour ouvrir un ticket.' },
      color: { type: String, default: '#5865F2' },
      footer: { type: String, default: 'Ohio Paradise' },
      thumbnailUrl: { type: String, default: null },
      imageUrl: { type: String, default: null },
    },
    buttons: [
      {
        id: { type: String },
        label: { type: String },
        emoji: { type: String, default: null },
        style: { type: String, default: 'Primary' },
        category: { type: String },
      }
    ],
  },

  exchangeConfig: {
    feePercent: { type: Number, default: 5 },
    minAmount: { type: Number, default: 5 },
    maxAmount: { type: Number, default: 5000 },
    activePairs: { type: [String], default: ['LTC_PAYPAL', 'BTC_PAYPAL', 'ETH_PAYPAL', 'LTC_BTC', 'PAYPAL_LTC', 'PAYPAL_BTC', 'PAYPAL_ETH', 'EUR_LTC', 'EUR_BTC'] },
    customFees: { type: Map, of: Number, default: {} },
  },

  paymentMethods: [
    {
      id: { type: String },
      name: { type: String },
      type: { type: String },
      address: { type: String, default: null },
      note: { type: String, default: null },
      qrUrl: { type: String, default: null },
      instructions: { type: String, default: null },
      color: { type: String, default: '#2b2d31' },
      enabled: { type: Boolean, default: true },
    }
  ],

  vouchRoles: [
    {
      threshold: { type: Number },
      roleId: { type: String },
    }
  ],

  exchangeTicketPanel: {
    channelId: { type: String, default: null },
    messageId: { type: String, default: null },
    embed: {
      title: { type: String, default: '💱 Exchange — Ohio Paradise' },
      description: { type: String, default: 'Sélectionne la crypto que tu envoies et celle que tu reçois pour ouvrir un ticket d\'exchange.' },
      color: { type: String, default: '#F1C40F' },
      footer: { type: String, default: 'Ohio Paradise Exchange' },
      thumbnailUrl: { type: String, default: null },
    },
  },

  exchangeMessages: {
    ticketOpenedMsg: { type: String, default: '✅ Ton ticket exchange a été créé : {channel}' },
    alreadyOpenMsg: { type: String, default: '❌ Tu as déjà un ticket exchange ouvert : {channel}' },
    welcomeTitle: { type: String, default: '💱 Exchange — {from} → {to}' },
    welcomeDescription: { type: String, default: 'Bonjour {user} ! 👋\n\nTu souhaites échanger **{amount} {from}** contre **{result} {to}**.\n\nUn staff va confirmer et traiter ton échange sous peu.\n\n> 💡 Assure-toi d\'avoir le montant prêt avant d\'envoyer.' },
    welcomeFooter: { type: String, default: 'Ohio Paradise Exchange • {date}' },
    rateFieldName: { type: String, default: '📈 Taux appliqué' },
    feeFieldName: { type: String, default: '💸 Frais ({fee}%)' },
    youSendFieldName: { type: String, default: '📤 Tu envoies' },
    youReceiveFieldName: { type: String, default: '📥 Tu reçois' },
    statusFieldName: { type: String, default: '📊 Statut' },
    statusPending: { type: String, default: '⏳ En attente de confirmation staff' },
    statusProcessing: { type: String, default: '🔄 En cours de traitement' },
    statusCompleted: { type: String, default: '✅ Exchange complété !' },
    statusCancelled: { type: String, default: '❌ Exchange annulé' },
    staffPingMsg: { type: String, default: '📢 {staff} — Nouvel exchange à traiter !' },
    closeMsg: { type: String, default: '🔒 Ticket fermé. Merci d\'avoir utilisé Ohio Paradise Exchange !' },
    modalTitle: { type: String, default: '💱 Montant à échanger' },
    modalAmountLabel: { type: String, default: 'Combien de {from} envoies-tu ?' },
    modalAmountPlaceholder: { type: String, default: 'ex: 0.5' },
    selectFromLabel: { type: String, default: '📤 Que veux-tu envoyer ?' },
    selectToLabel: { type: String, default: '📥 Que veux-tu recevoir ?' },
    belowMinMsg: { type: String, default: '❌ Montant minimum : {min} {from}' },
    aboveMaxMsg: { type: String, default: '❌ Montant maximum : {max} {from}' },
    pairDisabledMsg: { type: String, default: '❌ Cette paire d\'échange n\'est pas disponible.' },
    invalidAmountMsg: { type: String, default: '❌ Montant invalide. Entrez un nombre valide.' },
  },

  embedTemplates: [
    {
      id: { type: String },
      name: { type: String },
      embed: { type: Object },
    }
  ],
}, { timestamps: true });

module.exports = model('GuildConfig', GuildConfigSchema);
