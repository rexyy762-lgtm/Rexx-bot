// ============================================================
// automod/antispam.js — Rate-based spam detection
// ============================================================
'use strict';

// In-memory store: "guildId:userId" → timestamp[]
const messageLog = new Map();

// Cleanup old entries every 2 minutes to prevent memory leaks
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [key, times] of messageLog) {
    const filtered = times.filter((t) => t > cutoff);
    if (filtered.length === 0) messageLog.delete(key);
    else messageLog.set(key, filtered);
  }
}, 120_000);

/**
 * Returns true if the user is spamming in this guild.
 * @param {string} guildId
 * @param {string} userId
 * @param {number} threshold  - max messages allowed
 * @param {number} intervalMs - time window in ms
 */
function isSpamming(guildId, userId, threshold, intervalMs) {
  const key  = `${guildId}:${userId}`;
  const now  = Date.now();
  const prev = (messageLog.get(key) ?? []).filter((t) => now - t < intervalMs);

  prev.push(now);
  messageLog.set(key, prev);

  return prev.length > threshold;
}

module.exports = { isSpamming };
