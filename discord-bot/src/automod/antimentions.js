// ============================================================
// automod/antimentions.js — Mention spam detection
// ============================================================
'use strict';

/**
 * Returns the number of unique user/role mentions in a message.
 * Counts @everyone and @here as 1 mention each.
 */
function countMentions(message) {
  let count = message.mentions.users.size + message.mentions.roles.size;
  if (message.mentions.everyone) count += 1; // @everyone or @here
  return count;
}

/**
 * Returns true if the message exceeds the mention threshold.
 */
function hasMentionSpam(message, threshold) {
  return countMentions(message) >= threshold;
}

module.exports = { hasMentionSpam, countMentions };
