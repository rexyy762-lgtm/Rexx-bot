// ============================================================
// automod/antiscam.js — Scam / phishing link detection
// ============================================================
'use strict';

// Known phishing domain patterns (partial match)
const SCAM_DOMAINS = [
  'discord-nitro', 'discordnitro', 'discordgift', 'discord-gift',
  'steamcommunity-', 'steam-community', 'steamgift',
  'free-nitro', 'getnitro', 'claimnitro', 'nitro-free',
  'discord-airdrop', 'discord.gift-',
  'freebux', 'freevbucks', 'v-bucks-free',
  'roblox-free', 'robux-free', 'freerobux',
  'csgo-skins-free', 'free-skins',
];

// Keyword combos that strongly indicate scam content
const SCAM_KEYWORD_SETS = [
  ['free', 'nitro'],
  ['free', 'steam'],
  ['claim', 'nitro'],
  ['you', 'won'],
  ['click', 'here', 'free'],
  ['gift', 'card', 'free'],
  ['airdrop', 'discord'],
  ['crypto', 'giveaway', 'click'],
];

// URL regex — used to extract hostnames for domain checking
const URL_REGEX = /https?:\/\/([\w.-]+)/gi;

/**
 * Returns a reason string if the message looks like a scam, otherwise null.
 */
function isScam(content) {
  const lower = content.toLowerCase();

  // 1. Domain-level check
  let match;
  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(content)) !== null) {
    const host = match[1].toLowerCase();
    for (const pattern of SCAM_DOMAINS) {
      if (host.includes(pattern)) {
        return `Suspected phishing domain (${host})`;
      }
    }
  }

  // 2. Keyword combination check (must have a URL present)
  const hasUrl = /https?:\/\//i.test(content);
  if (hasUrl) {
    for (const keywords of SCAM_KEYWORD_SETS) {
      if (keywords.every((kw) => lower.includes(kw))) {
        return `Suspected scam content (keywords: ${keywords.join(', ')})`;
      }
    }
  }

  return null;
}

module.exports = { isScam };
