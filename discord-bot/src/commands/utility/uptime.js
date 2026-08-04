// ============================================================
// commands/utility/uptime.js
// Shows how long the bot has been online
// ============================================================

const { SlashCommandBuilder } = require("discord.js");
const { successEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("uptime")
    .setDescription("Shows the bot's uptime"),

  async execute(interaction) {
    const totalSeconds = Math.floor(process.uptime());

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    return interaction.reply({
      embeds: [
        successEmbed(
          `⏱️ **Bot Uptime:** \`${uptime}\``,
          "Bot Uptime"
        ),
      ],
    });
  },
};
