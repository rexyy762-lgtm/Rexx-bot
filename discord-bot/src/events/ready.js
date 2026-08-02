// ====================================================
// events/ready.js — Fired once when the bot logs in
// ====================================================

const { ActivityType } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,

  execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} guild(s)`);

    client.user.setPresence({
      activities: [
        {
          name: 'Serving your server',
          type: ActivityType.Playing,
        },
      ],
      status: 'online',
    });
  },
};
