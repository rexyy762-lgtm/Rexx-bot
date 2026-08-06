// ====================================================
// events/ready.js — Fired once when the bot logs in
// ====================================================

const { ActivityType } = require("discord.js");

module.exports = {
  name: "ready",
  once: true,

  execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} guild(s)`);

    const updatePresence = () => {
      const totalMembers = client.guilds.cache.reduce(
        (total, guild) => total + guild.memberCount,
        0
      );

      const statuses = [
        {
          name: "/help",
          type: ActivityType.Listening,
        },
        {
          name: `${client.guilds.cache.size} Servers`,
          type: ActivityType.Watching,
        },
        {
          name: `${totalMembers.toLocaleString()} Members`,
          type: ActivityType.Watching,
        },
      ];

      const status = statuses[Math.floor(Math.random() * statuses.length)];

      client.user.setPresence({
        activities: [
          {
            name: status.name,
            type: status.type,
          },
        ],
        status: "online",
      });
    };

    updatePresence();
    setInterval(updatePresence, 30000); // Every 30 seconds
  },
};
