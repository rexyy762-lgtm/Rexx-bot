// ============================================================
// utils/permissions.js — Permission check helpers
// ============================================================

const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed } = require('./embeds');

/**
 * Check if the interaction member has all required permissions.
 * Replies with an ephemeral error and returns false if any are missing.
 */
async function requirePermissions(interaction, ...perms) {
  if (!interaction.memberPermissions) return true; // DM or permission-less context

  for (const perm of perms) {
    if (!interaction.memberPermissions.has(perm)) {
      await interaction.reply({
        embeds: [errorEmbed(`You need the **${permName(perm)}** permission to use this command.`, 'Missing Permission')],
        ephemeral: true,
      });
      return false;
    }
  }
  return true;
}

/**
 * Check if the bot itself has all required permissions in the guild.
 * Replies with an ephemeral error and returns false if any are missing.
 */
async function requireBotPermissions(interaction, ...perms) {
  const bot = interaction.guild?.members?.me;
  if (!bot) return true;

  for (const perm of perms) {
    if (!bot.permissions.has(perm)) {
      await interaction.reply({
        embeds: [errorEmbed(`I need the **${permName(perm)}** permission to execute this command.`, 'Bot Missing Permission')],
        ephemeral: true,
      });
      return false;
    }
  }
  return true;
}

/** Convert a PermissionFlagsBit key to a readable label. */
function permName(perm) {
  const entry = Object.entries(PermissionFlagsBits).find(([, v]) => v === perm);
  return entry
    ? entry[0].replace(/([A-Z])/g, ' $1').trim()
    : String(perm);
}

module.exports = { requirePermissions, requireBotPermissions };
