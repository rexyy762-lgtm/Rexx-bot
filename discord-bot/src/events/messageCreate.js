// ============================================================
// events/messageCreate.js — Awards XP + runs AutoMod checks
// ============================================================
'use strict';

const { addXP, xpForLevel } = require('../utils/database');
const { colors, xpMin, xpMax, xpCooldown } = require('../config');
const { EmbedBuilder } = require('discord.js');
const { checkMessage } = require('../automod/index');

/** Map<guildId-userId, lastMessageTimestamp> for XP cooldowns. */
const cooldowns = new Map();

module.exports = {
  name: 'messageCreate',

  async execute(message) {
    // Ignore bots and DMs
    if (message.author.bot) return;
    if (!message.guild)     return;

    // ── AutoMod check (runs first, may delete the message) ──
    await checkMessage(message);

    // ── XP system ───────────────────────────────────────────
    // Note: if the message was deleted by AutoMod it still awards XP
    // (the message event already fired — this is intentional, the user
    // did type something).
    const key  = `${message.guild.id}-${message.author.id}`;
    const now  = Date.now();
    const last = cooldowns.get(key) ?? 0;

    if (now - last < xpCooldown) return;
    cooldowns.set(key, now);

    const amount = Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;
    const { level, leveledUp } = addXP(message.guild.id, message.author.id, amount);

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
