const { Schema, model } = require('mongoose');

const TicketSchema = new Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  category: { type: String, required: true },
  status: { type: String, enum: ['open', 'claimed', 'closed'], default: 'open' },
  claimedBy: { type: String, default: null },
  ticketNumber: { type: Number, required: true },
  orderId: { type: String, default: null },
  notes: [{ authorId: String, content: String, createdAt: { type: Date, default: Date.now } }],
  transcript: { type: String, default: null },
  closedAt: { type: Date, default: null },
  closedBy: { type: String, default: null },
}, { timestamps: true });

module.exports = model('Ticket', TicketSchema);
