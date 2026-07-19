// ============================================================
// automod/antiraid.js — Mass-join (raid) detection
// ============================================================
'use strict';

// In-memory: guildId → number[] of join timestamps
const joinLog = new Map();

// Cleanup every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [id, times] of joinLog) {
    const filtered = times.filter((t) => t > cutoff);
    if (!filtered.length) joinLog.delete(id);
    else joinLog.set(id, filtered);
  }
}, 300_000);

/**
 * Records a join and returns the number of joins in the last `intervalMs`.
 */
function recordJoin(guildId, intervalMs) {
  const now   = Date.now();
  const prev  = (joinLog.get(guildId) ?? []).filter((t) => now - t < intervalMs);
  prev.push(now);
  joinLog.set(guildId, prev);
  return prev.length;
}

/**
 * Clears the join log for a guild (useful after raid is handled).
 */
function clearJoinLog(guildId) {
  joinLog.delete(guildId);
}

module.exports = { recordJoin, clearJoinLog };
