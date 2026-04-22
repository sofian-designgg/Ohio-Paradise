const { Schema, model } = require('mongoose');

const AnnouncementSchema = new Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  cronExpression: { type: String, default: null },
  scheduledAt: { type: Date, default: null },
  embed: { type: Object, required: true },
  active: { type: Boolean, default: true },
  lastSentAt: { type: Date, default: null },
  jobId: { type: String, default: null },
}, { timestamps: true });

module.exports = model('Announcement', AnnouncementSchema);
