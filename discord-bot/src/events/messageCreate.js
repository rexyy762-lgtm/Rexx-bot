// ============================================================
// events/messageCreate.js — Awards XP on every user message
// ============================================================

const { addXP, xpForLevel } = require('../utils/database');
const { colors, xpMin, xpMax, xpCooldown } = require('../config');
const { EmbedBuilder } = require('discord.js');

/** Map<guildId-userId, lastMessageTimestamp> for XP cooldowns. */
const cooldowns = new Map();

module.exports = {
  name: 'messageCreate',

  async execute(message) {
    // Ignore bots and DMs
    // Note: message.content requires the MessageContent privileged intent.
    // XP is awarded based on the message event alone — not on content length.
    if (message.author.bot) return;
    if (!message.guild) return;

    const key = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();
    const last = cooldowns.get(key) ?? 0;

    // Respect the XP cooldown to prevent spam farming
    if (now - last < xpCooldown) return;
    cooldowns.set(key, now);

    // Award a random amount of XP
    const amount = Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;
    const { xp, level, leveledUp } = addXP(message.guild.id, message.author.id, amount);

    // Announce level-up in the same channel
    if (leveledUp) {
      const nextXP = Math.floor(xpForLevel(level + 1));
      const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setTitle('🎉 Level Up!')
        .setDescription(
          `${message.author} has reached **Level ${level}**! 🎊\n` +
          `Next level at **${nextXP.toLocaleString()} XP**.`
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await message.channel.send({ embeds: [embed] }).catch(() => {});
    }
  },
};
