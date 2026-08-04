// ============================================================
// commands/utility/messages.js
// Show total messages of a user
// ============================================================

const { SlashCommandBuilder } = require("discord.js");
const { getUserXP } = require("../../utils/database");
const { successEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("messages")
    .setDescription("Show the total messages of a user")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Select a user")
        .setRequired(false)
    ),

  async execute(interaction) {
    const user =
      interaction.options.getUser("user") || interaction.user;

    const data = getUserXP(interaction.guild.id, user.id);

    return interaction.reply({
      embeds: [
        successEmbed(
          `👤 **User:** ${user}\n📨 **Total Messages:** \`${data.messages}\``,
          "Message Statistics"
        ),
      ],
    });
  },
};
