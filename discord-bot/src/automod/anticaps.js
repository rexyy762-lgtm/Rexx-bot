// ============================================================
// automod/anticaps.js — Excessive capitals detection
// ============================================================
'use strict';

/**
 * Returns the percentage (0–100) of alphabetical characters that are uppercase.
 */
function capsPercentage(text) {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (!letters.length) return 0;
  const uppers = letters.replace(/[^A-Z]/g, '').length;
  return Math.round((uppers / letters.length) * 100);
}

/**
 * Returns true if the message is considered caps spam.
 * @param {string} content
 * @param {number} thresholdPct  - e.g. 70 means 70% caps triggers
 * @param {number} minLength     - only check messages at least this many chars
 */
function hasCapsSpam(content, thresholdPct, minLength) {
  const stripped = content.trim();
  if (stripped.length < minLength) return false;
  return capsPercentage(stripped) >= thresholdPct;
}

module.exports = { hasCapsSpam, capsPercentage };
