// ============================================================
// automod/warns.js — Warning system with auto-escalation
// ============================================================
'use strict';

const { addWarning, countWarnings, getConfig } = require('../utils/automodDb');
const { logModAction } = require('./modlog');

/**
 * Records a warning for a user and applies escalation punishments
 * based on the guild's warn thresholds.
 *
 * @param {import('discord.js').GuildMember} member
 * @param {string} reason
 * @param {string} [modId='AutoMod']
 * @returns {Promise<{ count: number, escalation: string|null }>}
 */
async function warnUser(member, reason, modId = 'AutoMod') {
  const { guild } = member;
  const config = getConfig(guild.id);

  // Record the warning
  const count = addWarning(guild.id, member.id, modId, reason);

  // Check escalation thresholds (highest first)
  let escalation = null;

  try {
    if (count >= config.warn_ban_at) {
      await guild.bans.create(member.user, { reason: `AutoMod: ${count} warnings — ${reason}` });
      escalation = 'banned';
      await logModAction({
        guild,
        target: member.user,
        action: 'ban',
        reason: `Auto-ban: reached ${count} warnings`,
        feature: 'Warn Escalation',
        warnCount: count,
      });
    } else if (count >= config.warn_kick_at) {
      await member.kick(`AutoMod: ${count} warnings — ${reason}`);
      escalation = 'kicked';
      await logModAction({
        guild,
        target: member.user,
        action: 'kick',
        reason: `Auto-kick: reached ${count} warnings`,
        feature: 'Warn Escalation',
        warnCount: count,
      });
    } else if (count >= config.warn_timeout_at) {
      const durationMs = config.warn_timeout_duration * 1000;
      await member.timeout(durationMs, `AutoMod: ${count} warnings — ${reason}`);
      escalation = `timed out (${Math.round(config.warn_timeout_duration / 60)}m)`;
      await logModAction({
        guild,
        target: member.user,
        action: 'timeout',
        reason: `Auto-timeout: reached ${count} warnings`,
        feature: 'Warn Escalation',
        warnCount: count,
        extra: `Duration: ${Math.round(config.warn_timeout_duration / 60)} minutes`,
      });
    }
  } catch (err) {
    console.error('[Warns] Escalation failed:', err.message);
  }

  return { count, escalation };
}

/**
 * DMs a user about the automod action taken against them.
 */
async function dmUser(user, guildName, reason, action, count) {
  try {
    const lines = [
      `🚨 **AutoMod** | **${guildName}**`,
      ``,
      `**Action:** ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      `**Reason:** ${reason}`,
    ];
    if (count !== undefined) lines.push(`**Total Warnings:** ${count}`);
    await user.send(lines.join('\n'));
  } catch {
    // DMs may be closed — silently ignore
  }
}

module.exports = { warnUser, dmUser };
