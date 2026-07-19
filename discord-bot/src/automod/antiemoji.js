// ============================================================
// automod/antiemoji.js — Emoji spam detection
// ============================================================
'use strict';

// Matches standard Unicode emoji sequences and custom Discord emoji <:name:id> / <a:name:id>
const UNICODE_EMOJI_REGEX = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;
const CUSTOM_EMOJI_REGEX  = /<a?:\w+:\d+>/g;

/**
 * Counts total emoji (Unicode + custom) in a string.
 */
function countEmoji(content) {
  const unicode = (content.match(UNICODE_EMOJI_REGEX) ?? []).length;
  const custom  = (content.match(CUSTOM_EMOJI_REGEX)  ?? []).length;
  return unicode + custom;
}

/**
 * Returns true if the message has more emoji than the threshold.
 */
function hasEmojiSpam(content, threshold) {
  return countEmoji(content) > threshold;
}

module.exports = { hasEmojiSpam, countEmoji };
