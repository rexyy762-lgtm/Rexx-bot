// ============================================================
// commands/music/music.js — /music command
// ============================================================
'use strict';

const { SlashCommandBuilder, EmbedBuilder, Colors } = require('discord.js');
const { spawn }   = require('child_process');
const path        = require('path');
const YouTube     = require('youtube-sr').default;
const musicPlayer = require('../../utils/musicPlayer');
const { createEmbed, successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');

const YT_DLP = path.join(__dirname, '../../../bin/yt-dlp');
const COOKIE_FILE = '/tmp/yt-cookies.txt';

// ── Helpers ────────────────────────────────────────────────────

function isYouTubeUrl(str) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch|shorts)|youtu\.be)\/.+/.test(str);
}

/** Resolve a YouTube URL → { title, url } using yt-dlp --dump-json */
function getVideoInfo(videoUrl) {
  return new Promise((resolve, reject) => {
    const args = [
      '--no-playlist',
      '--extractor-args', 'youtube:player_client=tv_embedded,mediaconnect',
      '--no-warnings', '--no-cache-dir',
      '--dump-json',
    ];
    const fs = require('fs');
    if (fs.existsSync(COOKIE_FILE)) args.push('--cookies', COOKIE_FILE);
    args.push(videoUrl);

    const proc = spawn(YT_DLP, args);
    let json = '', err = '';
    proc.stdout.on('data', (d) => { json += d.toString(); });
    proc.stderr.on('data', (d) => { err  += d.toString(); });
    proc.on('close', (code) => {
      if (code !== 0 || !json.trim()) {
        return reject(new Error(err.trim().slice(0, 200) || `yt-dlp exited ${code}`));
      }
      try {
        const data = JSON.parse(json.trim());
        resolve({ title: data.title ?? videoUrl, url: data.webpage_url ?? videoUrl });
      } catch {
        reject(new Error('Failed to parse yt-dlp JSON output'));
      }
    });
    proc.on('error', reject);
  });
}

/** Resolve search query or URL → { title, url } */
async function resolve(query) {
  if (isYouTubeUrl(query)) return getVideoInfo(query);
  const video = await YouTube.searchOne(query);
  if (!video?.url) throw new Error(`No results found for: ${query}`);
  return { title: video.title ?? 'Unknown Title', url: video.url };
}

// ── Setup instructions embed ───────────────────────────────────

function setupEmbed() {
  return new EmbedBuilder()
    .setColor(Colors.Yellow)
    .setTitle('🍪 Fix YouTube Playback — Add Cookies')
    .setDescription(
      'YouTube rate-limits the bot\'s server IP for videos requested too many times. ' +
      '**Authenticated cookies bypass this permanently.**\n\n' +
      '**Step-by-step setup:**'
    )
    .addFields(
      {
        name: '1️⃣  Install the extension',
        value: '[Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) (Chrome) ' +
               'or [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/) (Firefox)',
      },
      {
        name: '2️⃣  Export your YouTube cookies',
        value: 'Go to **youtube.com** while signed in → click the extension → **Export** → "For current site"',
      },
      {
        name: '3️⃣  Add as a Replit Secret',
        value: 'In your Replit workspace: **Secrets** tab → **New secret**\n' +
               '• Key: `YOUTUBE_COOKIES`\n' +
               '• Value: paste the entire cookies.txt content',
      },
      {
        name: '4️⃣  Restart the bot workflow',
        value: 'Restart the **Discord Bot** workflow in Replit. The bot will log\n`✅ YouTube cookies loaded — authenticated mode active`',
      },
      {
        name: '✅  Current cookie status',
        value: musicPlayer.hasCookies()
          ? '`Cookies loaded` — authenticated mode active'
          : '`No cookies` — running unauthenticated (some videos may fail)',
      },
    )
    .setFooter({ text: 'Once set up, all YouTube videos will play without restrictions' });
}

// ── Command definition ─────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('🎵 Music player controls')
    .addSubcommand((s) =>
      s.setName('play')
        .setDescription('Play a song by YouTube URL or search query')
        .addStringOption((o) =>
          o.setName('query')
            .setDescription('YouTube URL or search terms')
            .setRequired(true).setMaxLength(500)))
    .addSubcommand((s) => s.setName('stop').setDescription('Stop playback and disconnect'))
    .addSubcommand((s) => s.setName('skip').setDescription('Skip the current song'))
    .addSubcommand((s) => s.setName('pause').setDescription('Pause playback'))
    .addSubcommand((s) => s.setName('resume').setDescription('Resume paused playback'))
    .addSubcommand((s) => s.setName('queue').setDescription('Show the upcoming queue'))
    .addSubcommand((s) => s.setName('nowplaying').setDescription('Show currently playing song'))
    .addSubcommand((s) =>
      s.setName('volume')
        .setDescription('Set playback volume (1–100)')
        .addIntegerOption((o) =>
          o.setName('percent').setDescription('Volume percentage')
            .setRequired(true).setMinValue(1).setMaxValue(100)))
    .addSubcommand((s) => s.setName('setup').setDescription('Show cookie setup instructions for fixing YouTube playback')),

  async execute(interaction) {
    const sub          = interaction.options.getSubcommand();
    const guildId      = interaction.guild.id;
    const voiceChannel = interaction.member?.voice?.channel;

    if (['play', 'stop', 'skip', 'pause', 'resume'].includes(sub) && !voiceChannel) {
      return interaction.reply({
        embeds: [errorEmbed('You need to be in a voice channel to use music commands.')],
        flags: 64,
      });
    }

    // ── setup ────────────────────────────────────────────────
    if (sub === 'setup') {
      return interaction.reply({ embeds: [setupEmbed()], flags: 64 });
    }

    // ── play ─────────────────────────────────────────────────
    if (sub === 'play') {
      await interaction.deferReply();
      const query = interaction.options.getString('query', true);

      try {
        const { title, url } = await resolve(query);
        const songInfo = { title, url, requestedBy: interaction.user.tag };

        await musicPlayer.play(guildId, voiceChannel, interaction.channel, songInfo);

        const current  = musicPlayer.getCurrent(guildId);
        const isQueued = current !== null && current.url !== url;
        const queueLen = musicPlayer.getQueueList(guildId).length;

        return interaction.editReply({
          embeds: [createEmbed({
            title:       isQueued ? '📥 Added to Queue' : '▶️ Now Playing',
            description: `**[${title}](${url})**`,
            fields: [
              { name: '📢 Channel',      value: voiceChannel.name,                    inline: true },
              { name: '👤 Requested by', value: songInfo.requestedBy,                 inline: true },
              { name: '🎵 Position',     value: isQueued ? `#${queueLen}` : 'Now',    inline: true },
              ...(!musicPlayer.hasCookies()
                ? [{ name: '⚠️ Note', value: 'If playback fails, run `/music setup` to fix it permanently.', inline: false }]
                : []),
            ],
          })],
        });
      } catch (err) {
        console.error('[Music:play]', err.message);
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Red)
              .setTitle('❌ Could not queue track')
              .setDescription(`\`${err.message.slice(0, 300)}\``)
              .addFields({
                name: '💡 Fix',
                value: 'Run `/music setup` to add YouTube cookies and resolve playback issues.',
              }),
          ],
        });
      }
    }

    // ── stop ─────────────────────────────────────────────────
    if (sub === 'stop') {
      musicPlayer.destroyQueue(guildId);
      return interaction.reply({ embeds: [successEmbed('Stopped playback and disconnected.', '⏹️ Stopped')] });
    }

    // ── skip ─────────────────────────────────────────────────
    if (sub === 'skip') {
      if (!musicPlayer.skip(guildId))
        return interaction.reply({ embeds: [errorEmbed('Nothing is currently playing.')], flags: 64 });
      return interaction.reply({ embeds: [successEmbed('Skipped the current song.', '⏭️ Skipped')] });
    }

    // ── pause ────────────────────────────────────────────────
    if (sub === 'pause') {
      if (!musicPlayer.pause(guildId))
        return interaction.reply({ embeds: [errorEmbed('Nothing is playing or already paused.')], flags: 64 });
      return interaction.reply({ embeds: [successEmbed('Playback paused.', '⏸️ Paused')] });
    }

    // ── resume ───────────────────────────────────────────────
    if (sub === 'resume') {
      if (!musicPlayer.resume(guildId))
        return interaction.reply({ embeds: [errorEmbed('Nothing is paused.')], flags: 64 });
      return interaction.reply({ embeds: [successEmbed('Playback resumed.', '▶️ Resumed')] });
    }

    // ── queue ────────────────────────────────────────────────
    if (sub === 'queue') {
      const current = musicPlayer.getCurrent(guildId);
      const queue   = musicPlayer.getQueueList(guildId);
      if (!current)
        return interaction.reply({ embeds: [infoEmbed('The queue is empty.', '📋 Queue')] });

      const lines = queue.slice(0, 10).map(
        (s, i) => `**${i + 1}.** [${s.title}](${s.url}) — *${s.requestedBy}*`
      );
      return interaction.reply({
        embeds: [createEmbed({
          title: '📋 Music Queue',
          fields: [
            { name: '▶️ Now Playing', value: `[${current.title}](${current.url})`, inline: false },
            ...(lines.length
              ? [{ name: `⏭️ Up Next (${queue.length})`, value: lines.join('\n'), inline: false }]
              : []),
          ],
        })],
      });
    }

    // ── nowplaying ───────────────────────────────────────────
    if (sub === 'nowplaying') {
      const current = musicPlayer.getCurrent(guildId);
      if (!current)
        return interaction.reply({ embeds: [infoEmbed('Nothing is currently playing.', '🎵 Now Playing')] });

      return interaction.reply({
        embeds: [createEmbed({
          title:       musicPlayer.isPaused(guildId) ? '⏸️ Paused' : '▶️ Now Playing',
          description: `**[${current.title}](${current.url})**`,
          fields: [{ name: '👤 Requested by', value: current.requestedBy, inline: true }],
        })],
      });
    }

    // ── volume ───────────────────────────────────────────────
    if (sub === 'volume') {
      const percent = interaction.options.getInteger('percent', true);
      if (!musicPlayer.setVolume(guildId, percent))
        return interaction.reply({ embeds: [errorEmbed('Nothing is currently playing.')], flags: 64 });
      return interaction.reply({ embeds: [successEmbed(`Volume set to **${percent}%**.`, '🔊 Volume')] });
    }
  },
};
