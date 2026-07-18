// ============================================================
// utils/embeds.js — Reusable embed builder helpers
// ============================================================

const { EmbedBuilder } = require('discord.js');
const { colors } = require('../config');

/** Generic embed with a coloured left border. */
function createEmbed({ title, description, color = colors.primary, fields = [], footer, thumbnail, image, timestamp = true } = {}) {
  const embed = new EmbedBuilder().setColor(color);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields.length) embed.addFields(fields);
  if (footer) embed.setFooter(typeof footer === 'string' ? { text: footer } : footer);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (timestamp) embed.setTimestamp();
  return embed;
}

/** Success (green) embed. */
function successEmbed(description, title = 'Success') {
  return createEmbed({ title: `✅ ${title}`, description, color: colors.success });
}

/** Error (red) embed. */
function errorEmbed(description, title = 'Error') {
  return createEmbed({ title: `❌ ${title}`, description, color: colors.error });
}

/** Warning (yellow) embed. */
function warnEmbed(description, title = 'Warning') {
  return createEmbed({ title: `⚠️ ${title}`, description, color: colors.warning });
}

/** Info (blurple) embed. */
function infoEmbed(description, title = 'Info') {
  return createEmbed({ title: `ℹ️ ${title}`, description, color: colors.info });
}

module.exports = { createEmbed, successEmbed, errorEmbed, warnEmbed, infoEmbed };
