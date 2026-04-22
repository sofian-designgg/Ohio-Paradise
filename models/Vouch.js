const { Schema, model } = require('mongoose');

const VouchSchema = new Schema({
  guildId: { type: String, required: true },
  targetId: { type: String, required: true },
  authorId: { type: String, required: true },
  comment: { type: String, default: null },
  messageId: { type: String, default: null },
}, { timestamps: true });

module.exports = model('Vouch', VouchSchema);
