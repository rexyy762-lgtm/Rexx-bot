// ============================================================
// commands/moderation/unmute.js
// Remove timeout (Unmute) from a member
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
    .setName("unmute")
    .setDescription("Remove a timeout from a member")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("The member to unmute")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!(await requirePermissions(interaction, PermissionFlagsBits.ModerateMembers))) return;
    if (!(await requireBotPermissions(interaction, PermissionFlagsBits.ModerateMembers))) return;

    const member = interaction.options.getMember("user");

    if (!member) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            "❌ Member not found.",
            "Unmute Failed"
          ),
        ],
        ephemeral: true,
      });
    }
    if (!member.isCommunicationDisabled()) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            "❌ This member is not timed out.",
            "Unmute Failed"
          ),
        ],
        ephemeral: true,
      });
    }

    try {
      await member.timeout(null);
      return interaction.reply({
        embeds: [
          successEmbed(
            `✅ Successfully removed the timeout from ${member}.`,
            "Member Unmuted"
          ),
        ],
      });
    } catch (err) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            "❌ Failed to remove the timeout.",
            "Unmute Failed"
          ),
        ],
        ephemeral: true,
      });
    }
  },
};

