const { scheduleAnnouncement } = require('../commands/announce/announce');
const Announcement = require('../models/Announcement');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[Ready] Logged in as ${client.user.tag}`);
    client.user.setPresence({ activities: [{ name: 'Ohio Paradise 🛍️' }], status: 'online' });

    const announcements = await Announcement.find({ active: true, cronExpression: { $ne: null } });
    for (const ann of announcements) {
      scheduleAnnouncement(client, ann);
    }
    console.log(`[Announce] ${announcements.length} announcement(s) scheduled.`);
  },
};
