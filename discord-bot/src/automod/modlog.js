// ============================================================
// automod/modlog.js — Send mod-log embeds to the configured channel
// ============================================================
'use strict';

const { EmbedBuilder, Colors } = require('discord.js');
const { getConfig } = require('../utils/automodDb');

const ACTION_COLORS = {
  warn:    Colors.Yellow,
  timeout: Colors.Orange,
  kick:    Colors.Red,
  ban:     Colors.DarkRed,
  alert:   Colors.Purple,
  delete:  Colors.Grey,
};

const ACTION_ICONS = {
  warn:    '⚠️',
  timeout: '🔇',
  kick:    '👢',
  ban:     '🔨',
  alert:   '🚨',
  delete:  '🗑️',
};

/**
 * Sends a mod-log embed to the configured channel.
 *
 * @param {object} opts
 * @param {import('discord.js').Guild}    opts.guild
 * @param {import('discord.js').User}     opts.target
 * @param {string}                         opts.action   - warn | timeout | kick | ban | alert | delete
 * @param {string}                         opts.reason
 * @param {string}                        [opts.feature] - AutoMod module name
 * @param {number}                        [opts.warnCount]
 * @param {string}                        [opts.extra]   - extra description text
 */
async function logModAction({ guild, target, action, reason, feature = 'AutoMod', warnCount, extra }) {
  try {
    const config = getConfig(guild.id);
    if (!config.modlog_channel) return;

    const channel = guild.channels.cache.get(config.modlog_channel);
    if (!channel?.isTextBased()) return;

    const color  = ACTION_COLORS[action] ?? Colors.Blurple;
    const icon   = ACTION_ICONS[action]  ?? '🤖';
    const label  = action.charAt(0).toUpperCase() + action.slice(1);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${icon} AutoMod ${label}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 User',    value: `${target} \`${target.tag}\``,  inline: true },
        { name: '🆔 User ID', value: `\`${target.id}\``,             inline: true },
        { name: '🔧 Module',  value: feature,                        inline: true },
        { name: '📋 Reason',  value: reason },
      )
      .setFooter({ text: `AutoMod • ${guild.name}`, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
      .setTimestamp();

    if (warnCount !== undefined) {
      embed.addFields({ name: '⚠️ Total Warnings', value: String(warnCount), inline: true });
    }
    if (extra) {
      embed.addFields({ name: '📝 Details', value: extra });
    }

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('[ModLog] Failed to send log:', err.message);
  }
}

module.exports = { logModAction };
