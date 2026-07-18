// ============================================================
// events/guildMemberRemove.js — Goodbye message when a member leaves
// ============================================================

const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/database');
const { colors } = require('../config');

module.exports = {
  name: 'guildMemberRemove',

  async execute(member) {
    const config = getGuildConfig(member.guild.id);
    if (!config.goodbyeChannel) return;

    const channel = member.guild.channels.cache.get(config.goodbyeChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(colors.error)
      .setTitle('👋 A member has left')
      .setDescription(
        `**${member.user.tag}** has left the server.\n` +
        `We now have **${member.guild.memberCount}** member(s).`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL({ dynamic: true }) ?? undefined })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(err =>
      console.error('[guildMemberRemove] Could not send goodbye message:', err.message)
    );
  },
};
