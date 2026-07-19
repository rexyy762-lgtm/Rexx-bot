// ============================================================
// automod/antibadwords.js — Profanity / bad-word filter
// ============================================================
'use strict';

const { getBlacklist } = require('../utils/automodDb');

// Cache per guild: guildId → { words: string[], ts: number }
const cache = new Map();
const CACHE_TTL = 30_000; // 30 seconds (blacklist changes less often)

function getWords(guildId) {
  const cached = cache.get(guildId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.words;
  const words = getBlacklist(guildId);
  cache.set(guildId, { words, ts: Date.now() });
  return words;
}

/** Invalidate the blacklist cache for a guild (call after list changes). */
function invalidateBlacklistCache(guildId) {
  cache.delete(guildId);
}

/**
 * Returns the matched bad word if found in content, or null.
 * Normalises leet-speak variants: a→@/4, e→3, i→1/!, o→0, s→$
 */
function containsBadWord(guildId, content) {
  const words = getWords(guildId);
  if (!words.length) return null;

  // Normalise the message for leet-speak evasion
  const normalised = content
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/4/g, 'a')
    .replace(/3/g, 'e')
    .replace(/[1!]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/\$/g, 's')
    .replace(/[^a-z0-9\s]/g, '');

  for (const word of words) {
    // Whole-word match to avoid false positives
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
    if (regex.test(normalised)) return word;
  }
  return null;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { containsBadWord, invalidateBlacklistCache };
