// ============================================================
// config.js — Central configuration loaded from environment
// ============================================================

module.exports = {
  // Discord bot token (Bot tab in Developer Portal)
  token: process.env.DISCORD_TOKEN,

  // Application / Client ID (General Information tab)
  clientId: process.env.DISCORD_CLIENT_ID,

  // Guild ID for fast dev-command registration (optional)
  guildId: process.env.DISCORD_GUILD_ID,

  // OpenAI API key for the /ai command (optional — bot works without it)
  openaiApiKey: process.env.OPENAI_API_KEY,

  // Leveling — XP awarded per message (random between min and max)
  xpMin: 15,
  xpMax: 25,

  // Leveling — cooldown in ms before a user can earn XP again
  xpCooldown: 60_000,

  // Embed color palette
  colors: {
    primary: 0x5865f2,   // Discord blurple
    success: 0x57f287,   // Green
    warning: 0xfee75c,   // Yellow
    error: 0xed4245,     // Red
    info: 0x5865f2,      // Blurple
  },

  // Bot activity shown in the member list
  activity: {
    name: '/help',
    type: 'LISTENING', // PLAYING | LISTENING | WATCHING | COMPETING
  },
};
