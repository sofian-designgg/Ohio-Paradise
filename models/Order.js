const { Schema, model } = require('mongoose');

const OrderSchema = new Schema({
  guildId: { type: String, required: true },
  orderId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  staffId: { type: String, default: null },
  ticketChannelId: { type: String, default: null },
  product: { type: String, required: true },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'EUR' },
  paymentMethod: { type: String, default: null },
  status: {
    type: String,
    enum: ['pending', 'paid', 'delivered', 'cancelled', 'refunded'],
    default: 'pending',
  },
  notes: { type: String, default: null },
  statusHistory: [
    {
      status: String,
      changedBy: String,
      changedAt: { type: Date, default: Date.now },
      note: String,
    }
  ],
}, { timestamps: true });

module.exports = model('Order', OrderSchema);
