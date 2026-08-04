// ============================================================
// commands/moderation/unban.js
// Unban a user from the server
// ============================================================

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const {
  requirePermissions,
  requireBotPermissions,
} = require("../../utils/permissions");

const {
  successEmbed,
  errorEmbed,
} = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user using their ID")
    .addStringOption(option =>
      option
        .setName("userid")
        .setDescription("The ID of the user to unban")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    if (!(await requirePermissions(interaction, PermissionFlagsBits.BanMembers))) return;
    if (!(await requireBotPermissions(interaction, PermissionFlagsBits.BanMembers))) return;

    const userId = interaction.options.getString("userid");

    try {
      await interaction.guild.members.unban(userId);

      return interaction.reply({
        embeds: [
          successEmbed(
            `✅ Successfully unbanned user \`${userId}\`.`,
            "User Unbanned"
          ),
        ],
      });
    } catch (err) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            "❌ Invalid user ID or the user is not banned.",
            "Unban Failed"
          ),
        ],
        ephemeral: true,
      });
    }
  },
};
