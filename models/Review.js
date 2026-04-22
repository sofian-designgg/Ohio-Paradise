const { Schema, model } = require('mongoose');

const ReviewSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  orderId: { type: String, default: null },
  ticketChannelId: { type: String, default: null },
  stars: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: null },
  messageId: { type: String, default: null },
}, { timestamps: true });

module.exports = model('Review', ReviewSchema);
