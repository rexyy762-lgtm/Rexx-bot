// ============================================================
// automod/index.js — AutoMod orchestrator
// ============================================================
'use strict';

const { getConfig, getWhitelist }    = require('../utils/automodDb');
const { isSpamming }                 = require('./antispam');
const { containsBadWord }            = require('./antibadwords');
const { containsBlockedLink }        = require('./antilinks');
const { hasMentionSpam, countMentions } = require('./antimentions');
const { hasCapsSpam }                = require('./anticaps');
const { hasEmojiSpam, countEmoji }   = require('./antiemoji');
const { recordJoin, clearJoinLog }   = require('./antiraid');
const { isScam }                     = require('./antiscam');
const { warnUser, dmUser }           = require('./warns');
const { logModAction }               = require('./modlog');
const { PermissionFlagsBits }        = require('discord.js');

// ── Helpers ─────────────────────────────────────────────────

/** Returns true if the member is immune to AutoMod. */
function isExempt(message, config) {
  const { member, guild } = message;
  if (!member) return true;

  // Bot check (safety net — index.js also checks)
  if (message.author.bot) return true;

  // Server owner is always exempt
  if (member.id === guild.ownerId) return true;

  // Admins and users with Manage Messages are exempt
  if (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageMessages)
  ) return true;

  // Per-guild whitelist: users and roles
  const whitelist = getWhitelist(guild.id);

  if (whitelist.some((r) => r.type === 'user' && r.value === member.id)) return true;

  if (
    whitelist.some(
      (r) => r.type === 'role' && member.roles.cache.has(r.value)
    )
  ) return true;

  // Channel whitelist
  if (
    whitelist.some((r) => r.type === 'channel' && r.value === message.channelId)
  ) return true;

  return false;
}

/**
 * Core action handler — delete message, DM user, apply punishment, log.
 * @param {import('discord.js').Message} message
 * @param {object} opts
 * @param {string} opts.reason
 * @param {string} opts.action   — warn | timeout | kick | ban
 * @param {string} opts.feature  — module name for the log
 * @param {number} [opts.timeoutMs] — override timeout duration in ms
 */
async function applyAction(message, { reason, action, feature, timeoutMs }) {
  const { member, guild } = message;

  // Delete the offending message
  await message.delete().catch(() => {});

  let punishmentLabel = action;
  let warnCount;

  try {
    switch (action) {
      case 'warn': {
        const result = await warnUser(member, reason);
        warnCount = result.count;
        punishmentLabel = result.escalation
          ? `warn (→ auto ${result.escalation})`
          : `warn #${result.count}`;
        break;
      }
      case 'timeout': {
        const ms = timeoutMs ?? getConfig(guild.id).warn_timeout_duration * 1000;
        await member.timeout(ms, `AutoMod [${feature}]: ${reason}`);
        punishmentLabel = `timeout (${Math.round(ms / 60000)}m)`;
        break;
      }
      case 'kick': {
        await member.kick(`AutoMod [${feature}]: ${reason}`);
        break;
      }
      case 'ban': {
        await guild.bans.create(member.user, { reason: `AutoMod [${feature}]: ${reason}` });
        break;
      }
    }
  } catch (err) {
    console.error(`[AutoMod/${feature}] Action failed:`, err.message);
    return;
  }

  // DM the offending user
  await dmUser(message.author, guild.name, reason, action, warnCount);

  // Log to mod-log channel
  await logModAction({
    guild,
    target: message.author,
    action,
    reason,
    feature,
    warnCount,
  });
}

// ── Public: Message Check ───────────────────────────────────

/**
 * Main entry point — call this from messageCreate event.
 * Runs all enabled AutoMod checks on the message and stops
 * after the first violation to avoid double-punishing.
 *
 * @param {import('discord.js').Message} message
 */
async function checkMessage(message) {
  if (message.author.bot) return;
  if (!message.guild)     return;

  const config = getConfig(message.guild.id);
  if (!config?.enabled)   return;
  if (isExempt(message, config)) return;

  const { content } = message;
  const guildId     = message.guild.id;

  // ── 1. Anti Scam (highest priority — always on when enabled)
  if (config.antiscam_enabled) {
    const scamReason = isScam(content);
    if (scamReason) {
      await applyAction(message, {
        reason:  scamReason,
        action:  'ban',           // scam = instant ban
        feature: 'Anti Scam',
      });
      return;
    }
  }

  // ── 2. Anti Bad Words
  if (config.badwords_enabled) {
    const badWord = containsBadWord(guildId, content);
    if (badWord) {
      await applyAction(message, {
        reason:  `Blacklisted word detected`,
        action:  config.badwords_action,
        feature: 'Anti Bad Words',
      });
      return;
    }
  }

  // ── 3. Anti Links
  if (config.antilinks_enabled) {
    const linkViolation = containsBlockedLink(
      guildId,
      content,
      Boolean(config.antilinks_invites),
      Boolean(config.antilinks_external),
    );
    if (linkViolation) {
      await applyAction(message, {
        reason:  `Blocked link: ${linkViolation}`,
        action:  config.antilinks_action,
        feature: 'Anti Links',
      });
      return;
    }
  }

  // ── 4. Anti Mention Spam
  if (config.antimentions_enabled) {
    if (hasMentionSpam(message, config.antimentions_threshold)) {
      const count = countMentions(message);
      await applyAction(message, {
        reason:  `Excessive mentions (${count}/${config.antimentions_threshold} allowed)`,
        action:  config.antimentions_action,
        feature: 'Anti Mentions',
      });
      return;
    }
  }

  // ── 5. Anti Caps
  if (config.anticaps_enabled) {
    if (hasCapsSpam(content, config.anticaps_threshold, config.anticaps_min_length)) {
      await applyAction(message, {
        reason:  `Excessive capital letters (>${config.anticaps_threshold}%)`,
        action:  config.anticaps_action,
        feature: 'Anti Caps',
      });
      return;
    }
  }

  // ── 6. Anti Emoji Spam
  if (config.antiemoji_enabled) {
    if (hasEmojiSpam(content, config.antiemoji_threshold)) {
      const count = countEmoji(content);
      await applyAction(message, {
        reason:  `Emoji spam (${count} emoji, max ${config.antiemoji_threshold})`,
        action:  config.antiemoji_action,
        feature: 'Anti Emoji',
      });
      return;
    }
  }

  // ── 7. Anti Spam (last — rate-based, may fire even on short messages)
  if (config.antispam_enabled) {
    if (isSpamming(guildId, message.author.id, config.antispam_threshold, config.antispam_interval)) {
      const timeoutMs = config.antispam_timeout_mins * 60 * 1000;
      await applyAction(message, {
        reason:  `Sending messages too quickly (>${config.antispam_threshold} in ${config.antispam_interval / 1000}s)`,
        action:  config.antispam_action,
        feature: 'Anti Spam',
        timeoutMs,
      });
      return;
    }
  }
}

// ── Public: Raid Check ──────────────────────────────────────

/**
 * Call this from guildMemberAdd event.
 * Logs the join and alerts/kicks/bans if raid threshold is hit.
 *
 * @param {import('discord.js').GuildMember} member
 */
async function checkRaid(member) {
  const { guild } = member;
  const config = getConfig(guild.id);
  if (!config?.enabled || !config.antiraid_enabled) return;

  const joinCount = recordJoin(guild.id, config.antiraid_interval);
  if (joinCount < config.antiraid_threshold) return;

  // Raid detected!
  console.warn(`[AutoMod/Anti Raid] Raid detected in ${guild.name} — ${joinCount} joins in ${config.antiraid_interval / 1000}s`);

  const action = config.antiraid_action;

  // Alert moderators
  await logModAction({
    guild,
    target: member.user,
    action: 'alert',
    reason: `Raid detected: ${joinCount} joins in ${config.antiraid_interval / 1000} seconds`,
    feature: 'Anti Raid',
    extra:   `Last joiner: ${member.user.tag} (\`${member.id}\`)\nAction taken: ${action}`,
  });

  if (action === 'kick' || action === 'ban') {
    try {
      if (action === 'kick') {
        await member.kick('AutoMod: Anti-Raid triggered');
      } else {
        await guild.bans.create(member.user, { reason: 'AutoMod: Anti-Raid triggered' });
      }
    } catch (err) {
      console.error('[AutoMod/Anti Raid] Could not punish raider:', err.message);
    }
  }

  // Clear log after handling to avoid re-firing for every subsequent joiner
  clearJoinLog(guild.id);
}

module.exports = { checkMessage, checkRaid };
