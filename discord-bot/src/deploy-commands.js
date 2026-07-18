// ============================================================
// deploy-commands.js — Register slash commands with Discord
// Run with: node src/deploy-commands.js
//
// If DISCORD_GUILD_ID is set → registers to that guild instantly
// Otherwise             → registers globally (up to 1 hour delay)
// ============================================================

// discord.js re-exports both REST and Routes so we don't need @discordjs/rest directly
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { token, clientId, guildId } = require('./config');

if (!token || !clientId) {
  console.error('❌ DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in environment.');
  process.exit(1);
}

// ── Collect all command data objects ─────────────────────────
const commands = [];
const commandsPath = path.join(__dirname, 'commands');

for (const folder of fs.readdirSync(commandsPath)) {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;

  for (const file of fs.readdirSync(folderPath).filter(f => f.endsWith('.js'))) {
    const cmd = require(path.join(folderPath, file));
    if (cmd.data) commands.push(cmd.data.toJSON());
  }
}

// ── Deploy via REST ───────────────────────────────────────────
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  console.log(`⏳ Registering ${commands.length} slash command(s)…`);

  if (guildId) {
    // Guild-scoped — takes effect immediately
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`✅ Registered ${commands.length} command(s) to guild ${guildId}`);
  } else {
    // Global — can take up to one hour to propagate
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(`✅ Registered ${commands.length} command(s) globally (up to 1 h to propagate)`);
  }
})().catch(err => {
  console.error('❌ Failed to register commands:', err);
  process.exit(1);
});
