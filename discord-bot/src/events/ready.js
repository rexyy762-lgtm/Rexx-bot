// ============================================================
// events/ready.js — Fired once when the bot logs in
// ============================================================

const { ActivityType } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true, // only fires once, not on reconnect

  execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} guild(s) | ${client.users.cache.size} cached user(s)`);

    // Set the bot's presence/activity
    client.user.setPresence({
      activities: [{ name: '/help', type: ActivityType.Listening }],
      status: 'online',
    });
  },
};
