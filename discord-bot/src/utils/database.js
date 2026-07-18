// ============================================================
// utils/database.js — Simple JSON-based persistent storage
// Stores leveling data and server configuration on disk.
// ============================================================

const fs = require('fs');
const path = require('path');

// Ensure the data directory exists
const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const LEVELS_FILE = path.join(DATA_DIR, 'levels.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// ── Generic helpers ──────────────────────────────────────────

/** Read a JSON file, returning a default value if it doesn't exist yet. */
function readJson(filePath, defaultValue = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return defaultValue;
  }
}

/** Write data to a JSON file atomically (write to temp then rename). */
function writeJson(filePath, data) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

// ── Leveling ─────────────────────────────────────────────────

/**
 * Get XP data for a specific user in a guild.
 * Returns { xp, level, messages }.
 */
function getUserXP(guildId, userId) {
  const db = readJson(LEVELS_FILE);
  return db[guildId]?.[userId] ?? { xp: 0, level: 0, messages: 0 };
}

/**
 * Add XP to a user and recalculate their level.
 * Returns { xp, level, messages, leveledUp }.
 */
function addXP(guildId, userId, amount) {
  const db = readJson(LEVELS_FILE);
  if (!db[guildId]) db[guildId] = {};
  const user = db[guildId][userId] ?? { xp: 0, level: 0, messages: 0 };

  user.xp += amount;
  user.messages += 1;

  const newLevel = calculateLevel(user.xp);
  const leveledUp = newLevel > user.level;
  user.level = newLevel;

  db[guildId][userId] = user;
  writeJson(LEVELS_FILE, db);

  return { ...user, leveledUp };
}

/**
 * Get all users for a guild, sorted by XP descending.
 * Returns array of { userId, xp, level, messages }.
 */
function getLeaderboard(guildId) {
  const db = readJson(LEVELS_FILE);
  const guildData = db[guildId] ?? {};
  return Object.entries(guildData)
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.xp - a.xp);
}

/**
 * Get a user's rank (1-based position) on the leaderboard.
 */
function getUserRank(guildId, userId) {
  const lb = getLeaderboard(guildId);
  const index = lb.findIndex(u => u.userId === userId);
  return index === -1 ? lb.length + 1 : index + 1;
}

/**
 * Calculate the level for a given XP value.
 * Formula: level = floor(0.1 * sqrt(xp))
 */
function calculateLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

/**
 * Calculate how much total XP is needed to reach a given level.
 */
function xpForLevel(level) {
  return Math.pow(level / 0.1, 2);
}

// ── Server Configuration ──────────────────────────────────────

/**
 * Get configuration for a guild. Returns {} if not set.
 */
function getGuildConfig(guildId) {
  const db = readJson(CONFIG_FILE);
  return db[guildId] ?? {};
}

/**
 * Merge new keys into a guild's config (partial update).
 */
function setGuildConfig(guildId, updates) {
  const db = readJson(CONFIG_FILE);
  db[guildId] = { ...(db[guildId] ?? {}), ...updates };
  writeJson(CONFIG_FILE, db);
}

module.exports = {
  getUserXP,
  addXP,
  getLeaderboard,
  getUserRank,
  calculateLevel,
  xpForLevel,
  getGuildConfig,
  setGuildConfig,
};
