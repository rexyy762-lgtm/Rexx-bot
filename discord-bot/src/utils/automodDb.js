// ============================================================
// utils/automodDb.js — SQLite database for Auto Moderation
// ============================================================
'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'automod.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ─────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS automod_config (
    guild_id              TEXT PRIMARY KEY,
    enabled               INTEGER NOT NULL DEFAULT 1,

    -- Anti Spam
    antispam_enabled      INTEGER NOT NULL DEFAULT 1,
    antispam_threshold    INTEGER NOT NULL DEFAULT 5,
    antispam_interval     INTEGER NOT NULL DEFAULT 5000,
    antispam_action       TEXT    NOT NULL DEFAULT 'warn',
    antispam_timeout_mins INTEGER NOT NULL DEFAULT 5,

    -- Anti Bad Words
    badwords_enabled      INTEGER NOT NULL DEFAULT 1,
    badwords_action       TEXT    NOT NULL DEFAULT 'warn',

    -- Anti Links
    antilinks_enabled     INTEGER NOT NULL DEFAULT 1,
    antilinks_invites     INTEGER NOT NULL DEFAULT 1,
    antilinks_external    INTEGER NOT NULL DEFAULT 0,
    antilinks_action      TEXT    NOT NULL DEFAULT 'warn',

    -- Anti Mention Spam
    antimentions_enabled  INTEGER NOT NULL DEFAULT 1,
    antimentions_threshold INTEGER NOT NULL DEFAULT 5,
    antimentions_action   TEXT    NOT NULL DEFAULT 'warn',

    -- Anti Caps
    anticaps_enabled      INTEGER NOT NULL DEFAULT 1,
    anticaps_threshold    INTEGER NOT NULL DEFAULT 70,
    anticaps_min_length   INTEGER NOT NULL DEFAULT 10,
    anticaps_action       TEXT    NOT NULL DEFAULT 'warn',

    -- Anti Emoji Spam
    antiemoji_enabled     INTEGER NOT NULL DEFAULT 1,
    antiemoji_threshold   INTEGER NOT NULL DEFAULT 10,
    antiemoji_action      TEXT    NOT NULL DEFAULT 'warn',

    -- Anti Raid
    antiraid_enabled      INTEGER NOT NULL DEFAULT 1,
    antiraid_threshold    INTEGER NOT NULL DEFAULT 10,
    antiraid_interval     INTEGER NOT NULL DEFAULT 10000,
    antiraid_action       TEXT    NOT NULL DEFAULT 'alert',

    -- Anti Scam
    antiscam_enabled      INTEGER NOT NULL DEFAULT 1,

    -- Warn escalation thresholds
    warn_timeout_at       INTEGER NOT NULL DEFAULT 3,
    warn_kick_at          INTEGER NOT NULL DEFAULT 5,
    warn_ban_at           INTEGER NOT NULL DEFAULT 7,
    warn_timeout_duration INTEGER NOT NULL DEFAULT 600,

    -- Logging
    modlog_channel        TEXT
  );

  CREATE TABLE IF NOT EXISTS automod_warnings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id     TEXT    NOT NULL,
    user_id      TEXT    NOT NULL,
    moderator_id TEXT    NOT NULL,
    reason       TEXT    NOT NULL,
    timestamp    INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_warnings_guild_user
    ON automod_warnings (guild_id, user_id);

  CREATE TABLE IF NOT EXISTS automod_whitelist (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    type     TEXT NOT NULL,
    value    TEXT NOT NULL,
    UNIQUE(guild_id, type, value)
  );

  CREATE INDEX IF NOT EXISTS idx_whitelist_guild
    ON automod_whitelist (guild_id);

  CREATE TABLE IF NOT EXISTS automod_blacklist (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    word     TEXT NOT NULL,
    UNIQUE(guild_id, word)
  );

  CREATE INDEX IF NOT EXISTS idx_blacklist_guild
    ON automod_blacklist (guild_id);
`);

// ── Config cache (1 min TTL) ────────────────────────────────
const configCache = new Map();
const CACHE_TTL = 60_000;

const stmts = {
  getConfig:    db.prepare('SELECT * FROM automod_config WHERE guild_id = ?'),
  insertConfig: db.prepare('INSERT OR IGNORE INTO automod_config (guild_id) VALUES (?)'),
  updateField:  (col) => db.prepare(`UPDATE automod_config SET ${col} = ? WHERE guild_id = ?`),

  addWarning: db.prepare(
    'INSERT INTO automod_warnings (guild_id, user_id, moderator_id, reason, timestamp) VALUES (?,?,?,?,?)'
  ),
  getWarnings:   db.prepare('SELECT * FROM automod_warnings WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC'),
  countWarnings: db.prepare('SELECT COUNT(*) AS cnt FROM automod_warnings WHERE guild_id = ? AND user_id = ?'),
  clearWarnings: db.prepare('DELETE FROM automod_warnings WHERE guild_id = ? AND user_id = ?'),
  clearAll:      db.prepare('DELETE FROM automod_warnings WHERE guild_id = ?'),

  addWhitelist:    db.prepare('INSERT OR IGNORE INTO automod_whitelist (guild_id, type, value) VALUES (?,?,?)'),
  removeWhitelist: db.prepare('DELETE FROM automod_whitelist WHERE guild_id = ? AND type = ? AND value = ?'),
  getWhitelist:    db.prepare('SELECT * FROM automod_whitelist WHERE guild_id = ?'),

  addBlacklist:    db.prepare('INSERT OR IGNORE INTO automod_blacklist (guild_id, word) VALUES (?,?)'),
  removeBlacklist: db.prepare('DELETE FROM automod_blacklist WHERE guild_id = ? AND word = ?'),
  getBlacklist:    db.prepare('SELECT word FROM automod_blacklist WHERE guild_id = ?'),
};

// ── Public API ──────────────────────────────────────────────

/** Returns config row for a guild, creating defaults if needed. */
function getConfig(guildId) {
  const cached = configCache.get(guildId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  stmts.insertConfig.run(guildId);
  const data = stmts.getConfig.get(guildId);
  configCache.set(guildId, { data, ts: Date.now() });
  return data;
}

/** Invalidates the config cache for a guild. */
function invalidateCache(guildId) {
  configCache.delete(guildId);
}

/** Update a single column in automod_config. */
function setConfigField(guildId, col, value) {
  stmts.updateField(col).run(value, guildId);
  invalidateCache(guildId);
}

/** Batch update multiple fields. */
function setConfigFields(guildId, fields) {
  const update = db.transaction((f) => {
    for (const [col, val] of Object.entries(f)) {
      stmts.updateField(col).run(val, guildId);
    }
  });
  update(fields);
  invalidateCache(guildId);
}

// ── Warnings ────────────────────────────────────────────────

function addWarning(guildId, userId, moderatorId, reason) {
  stmts.addWarning.run(guildId, userId, moderatorId, reason, Date.now());
  return stmts.countWarnings.get(guildId, userId).cnt;
}

function getWarnings(guildId, userId) {
  return stmts.getWarnings.all(guildId, userId);
}

function countWarnings(guildId, userId) {
  return stmts.countWarnings.get(guildId, userId).cnt;
}

function clearWarnings(guildId, userId) {
  const info = stmts.clearWarnings.run(guildId, userId);
  return info.changes;
}

// ── Whitelist ───────────────────────────────────────────────

function addWhitelist(guildId, type, value) {
  stmts.addWhitelist.run(guildId, type, value.toLowerCase());
}

function removeWhitelist(guildId, type, value) {
  stmts.removeWhitelist.run(guildId, type, value.toLowerCase());
}

function getWhitelist(guildId) {
  return stmts.getWhitelist.all(guildId);
}

// ── Blacklist ───────────────────────────────────────────────

function addBlacklist(guildId, word) {
  stmts.addBlacklist.run(guildId, word.toLowerCase());
}

function removeBlacklist(guildId, word) {
  stmts.removeBlacklist.run(guildId, word.toLowerCase());
}

function getBlacklist(guildId) {
  return stmts.getBlacklist.all(guildId).map((r) => r.word);
}

module.exports = {
  getConfig,
  invalidateCache,
  setConfigField,
  setConfigFields,
  addWarning,
  getWarnings,
  countWarnings,
  clearWarnings,
  addWhitelist,
  removeWhitelist,
  getWhitelist,
  addBlacklist,
  removeBlacklist,
  getBlacklist,
};
