// ============================================================
// commands/utility/messagesleaderboard.js
// Message Leaderboard
// ============================================================

const { SlashCommandBuilder } = require("discord.js");
const { getLeaderboard } = require("../../utils/database");
const { successEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("messagesleaderboard")
    .setDescription("Show the server message leaderboard"),

  async execute(interaction) {
    const leaderboard = getLeaderboard(interaction.guild.id)
      .sort((a, b) => b.messages - a.messages)
      .slice(0, 10);

    if (!leaderboard.length) {
      return interaction.reply({
        embeds: [
          successEmbed(
            "📭 No message data found yet.",
            "Message Leaderboard"
          ),
        ],
      });
    }

    const text = leaderboard
      .map((user, index) =>
        `${index + 1}. <@${user.userId}> — 📨 ${user.messages} messages`
      )
      .join("\n");

    return interaction.reply({
      embeds: [
        successEmbed(
          text,
          "🏆 Message Leaderboard"
        ),
      ],
    });
  },
};
