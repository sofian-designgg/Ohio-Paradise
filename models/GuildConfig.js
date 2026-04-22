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
    activePairs: { type: [String], default: ['LTC_PAYPAL', 'BTC_PAYPAL', 'ETH_PAYPAL', 'LTC_BTC'] },
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

  embedTemplates: [
    {
      id: { type: String },
      name: { type: String },
      embed: { type: Object },
    }
  ],
}, { timestamps: true });

module.exports = model('GuildConfig', GuildConfigSchema);
