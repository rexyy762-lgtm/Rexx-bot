// ============================================================
// events/messageCreate.js — Awards XP + runs AutoMod checks
// await checkMessage(message);// ============================================================
'use strict';

const { addXP, xpForLevel } = require('../utils/database');
const { colors, xpMin, xpMax, xpCooldown } = require('../config');
const { EmbedBuilder } = require('discord.js');


/** Map<guildId-userId, lastMessageTimestamp> for XP cooldowns. */
const cooldowns = new Map();

module.exports = {
  name: 'messageCreate',

  async execute(message) {
    // Ignore bots and DMs
    if (message.author.bot) return;
    if (!message.guild)     return;

// ── Prefix to Slash command bridge ──────────────────────────
const prefix = "n!";

if (message.content.startsWith(prefix)) {
  const args = message.content
    .slice(prefix.length)
    .trim()
    .split(/ +/);

  const commandName = args.shift().toLowerCase();

  const command = message.client.commands.get(commandName);

  if (command) {
    try {
      const fakeInteraction = {
        ...message,
        isChatInputCommand: () => true,
        commandName,
        options: {
          getString: (name) => args.join(" "),
          getUser: () => message.mentions.users.first(),
          getMember: () => message.mentions.members.first(),
        },
        reply: (content) => message.reply(content),
        deferReply: async () => {},
        editReply: (content) => message.reply(content),
        followUp: (content) => message.reply(content),
        user: message.author,
      };

      await command.execute(fakeInteraction);

    } catch (error) {
      console.error("Prefix Bridge Error:", error);
      message.reply("❌ Command error.");
    }
  }
}

    // ── AutoMod check (runs first, may delete the message) ─

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
