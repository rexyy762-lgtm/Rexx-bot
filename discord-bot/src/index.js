// ============================================================
// index.js — Bot entry point
// Loads commands and events, then logs in to Discord.
// ============================================================

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { token } = require('./config');

// ── Create client with required intents ──────────────────────
// GuildMembers and MessageContent are privileged intents — they require manual
// activation in the Discord Developer Portal (Bot → Privileged Gateway Intents).
// They are intentionally omitted here so the bot can start without them.
// Once you enable them in the portal, add them back to restore:
//   • /welcome  /goodbye  (needs GuildMembers)
//   • XP leveling         (needs MessageContent)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// ── Attach a commands Collection to the client ───────────────
client.commands = new Collection();

// ── Load all command files recursively from commands/ ────────
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;

  const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));
    if (!command.data || !command.execute) {
      console.warn(`⚠️  Skipping ${file} — missing data or execute export`);
      continue;
    }
    client.commands.set(command.data.name, command);
    console.log(`  ✔ Loaded command: /${command.data.name}`);
  }
}

// ── Load all event files from events/ ────────────────────────
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  console.log(`  ✔ Loaded event: ${event.name}`);
}

// ── Validate token before connecting ─────────────────────────
if (!token) {
  console.error('❌ DISCORD_TOKEN is not set. Add it to your Replit Secrets.');
  process.exit(1);
}

// ── Log in ───────────────────────────────────────────────────
client.login(token).catch(err => {
  console.error('❌ Failed to log in:', err.message);
  process.exit(1);
});
