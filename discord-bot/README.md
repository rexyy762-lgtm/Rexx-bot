# Discord Bot 🤖

A multipurpose Discord.js bot with 22 slash commands.

## Setup

All credentials are stored in Replit Secrets (already configured):
- `DISCORD_TOKEN` — Bot token
- `DISCORD_CLIENT_ID` — Application client ID
- `DISCORD_GUILD_ID` — Guild ID for fast command registration

Optional:
- `OPENAI_API_KEY` — Required only for the `/ai` command

## Folder Structure

```
discord-bot/
├── src/
│   ├── index.js               — Bot entry point (loads commands + events)
│   ├── deploy-commands.js     — Register slash commands with Discord
│   ├── config.js              — Central config (tokens, colors, XP settings)
│   ├── commands/
│   │   ├── general/           — /ping /help /userinfo /serverinfo /avatar /say /poll /embed
│   │   ├── moderation/        — /ban /kick /timeout /clear
│   │   ├── utility/           — /role /welcome /goodbye /ticket /suggest
│   │   ├── leveling/          — /level /rank /leaderboard
│   │   ├── ai/                — /ai
│   │   └── music/             — /music (play stop skip pause resume queue nowplaying volume)
│   ├── events/
│   │   ├── ready.js           — Bot startup
│   │   ├── interactionCreate.js — Routes slash commands
│   │   ├── guildMemberAdd.js  — Welcome messages
│   │   ├── guildMemberRemove.js — Goodbye messages
│   │   └── messageCreate.js   — XP / leveling
│   └── utils/
│       ├── database.js        — JSON storage (levels + server config)
│       ├── embeds.js          — Reusable embed helpers
│       ├── permissions.js     — Permission check helpers
│       └── musicPlayer.js     — Per-guild music queue manager
└── data/                      — Auto-created, stores levels.json + config.json
```

## Commands Reference

| Category   | Command | Description |
|-----------|---------|-------------|
| General   | `/ping` | Bot latency |
| General   | `/help` | List all commands |
| General   | `/userinfo [user]` | User info |
| General   | `/serverinfo` | Server info |
| General   | `/avatar [user]` | Show avatar |
| General   | `/say <message> [channel]` | Send message as bot |
| General   | `/poll <question> <opt1> <opt2> [opt3] [opt4]` | Create reaction poll |
| General   | `/embed <title> <desc> [color] [footer] [image]` | Send custom embed |
| Moderation | `/ban <user> [reason] [days]` | Ban member |
| Moderation | `/kick <user> [reason]` | Kick member |
| Moderation | `/timeout <user> <duration> [reason]` | Timeout member |
| Moderation | `/clear <amount> [user]` | Bulk-delete messages |
| Utility   | `/role add/remove <user> <role>` | Manage roles |
| Utility   | `/welcome set/disable/status [channel]` | Welcome channel |
| Utility   | `/goodbye set/disable/status [channel]` | Goodbye channel |
| Utility   | `/ticket create/close/setup` | Support tickets |
| Utility   | `/suggest add/setup` | Suggestions |
| Leveling  | `/level` | Your XP progress |
| Leveling  | `/rank [user]` | Server rank |
| Leveling  | `/leaderboard` | Top 10 by XP |
| AI        | `/ai <prompt>` | Ask the AI (needs OPENAI_API_KEY) |
| Music     | `/music play/stop/skip/pause/resume/queue/nowplaying/volume` | Music player |

## Deploying Commands

Slash commands are registered via a separate script (run once or after adding new commands):

```sh
pnpm --filter @workspace/discord-bot run deploy
```

If `DISCORD_GUILD_ID` is set, commands register to that guild instantly.
Otherwise they register globally (up to 1 hour to propagate).

## Notes

- **Music**: Requires ffmpeg to be available on the system path.
- **AI**: Requires `OPENAI_API_KEY` in Replit Secrets.
- **Leveling**: XP is earned per message with a 60-second cooldown to prevent spam.
- **Data**: Stored in `discord-bot/data/` as JSON files (created automatically).
