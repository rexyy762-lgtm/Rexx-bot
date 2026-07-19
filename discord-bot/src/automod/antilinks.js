// ============================================================
// automod/antilinks.js — Discord invite & external link blocker
// ============================================================
'use strict';

const { getWhitelist } = require('../utils/automodDb');

const INVITE_REGEX  = /discord(?:\.gg|(?:app)?\.com\/invite)\/[\w-]+/gi;
const URL_REGEX     = /https?:\/\/[\w.-]+(?:\.[\w]{2,})+(?:\/\S*)?/gi;

// Cache per guild: guildId → { domains: Set, ts: number }
const wlCache = new Map();
const CACHE_TTL = 30_000;

function getWhitelistedDomains(guildId) {
  const cached = wlCache.get(guildId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.domains;

  const list = getWhitelist(guildId);
  const domains = new Set(
    list.filter((r) => r.type === 'link').map((r) => r.value.toLowerCase())
  );
  wlCache.set(guildId, { domains, ts: Date.now() });
  return domains;
}

/** Invalidate link whitelist cache for a guild. */
function invalidateLinkCache(guildId) {
  wlCache.delete(guildId);
}

/**
 * Returns a description of the violation if the message contains
 * a blocked link, otherwise null.
 */
function containsBlockedLink(guildId, content, blockInvites, blockExternal) {
  const domains = getWhitelistedDomains(guildId);

  if (blockInvites && INVITE_REGEX.test(content)) {
    INVITE_REGEX.lastIndex = 0;
    return 'Discord invite link';
  }
  INVITE_REGEX.lastIndex = 0;

  if (blockExternal) {
    const matches = content.match(URL_REGEX) ?? [];
    for (const url of matches) {
      try {
        const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
        if (!domains.has(host)) {
          return `External link (${host})`;
        }
      } catch {
        // Malformed URL — treat as blocked
        return 'Suspicious link';
      }
    }
  }

  return null;
}

module.exports = { containsBlockedLink, invalidateLinkCache };
