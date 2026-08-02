// ============================================================
// events/guildMemberAdd.js — Welcome message + Anti-Raid check
// ============================================================
'use strict';

const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/database');
const { colors } = require('../config');


module.exports = {
  name: 'guildMemberAdd',

  async execute(member) {
    // ── Anti-Raid detection ──────────────────────────────────
    

    // ── Welcome message ──────────────────────────────────────
    const config = getGuildConfig(member.guild.id);
    if (!config.welcomeChannel) return;

    const channel = member.guild.channels.cache.get(config.welcomeChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(colors.success)
      .setTitle('👋 Welcome to the server!')
      .setDescription(
        `Welcome, ${member}! We're happy to have you here.\n\n` +
        `You are member **#${member.guild.memberCount}**. Enjoy your stay!`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL({ dynamic: true }) ?? undefined })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch((err) =>
      console.error('[guildMemberAdd] Could not send welcome message:', err.message)
    );
  },
};
