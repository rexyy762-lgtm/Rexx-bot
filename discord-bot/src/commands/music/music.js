// ============================================================
// commands/music/music.js — Music player slash command
//
// Search: youtube-sr    (no auth needed)
// Meta:   yt-dlp --dump-json  with tv_embedded client
// Stream: yt-dlp tv_embedded → piped through @discordjs/voice FFmpeg
// ============================================================
'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { spawn } = require('child_process');
const path      = require('path');
const YouTube   = require('youtube-sr').default;
const musicPlayer = require('../../utils/musicPlayer');
const { createEmbed, successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');

const YT_DLP = path.join(__dirname, '../../../bin/yt-dlp');

// Shared bypass flags — same as musicPlayer.js
const YT_CLIENT_ARGS = [
  '--extractor-args', 'youtube:player_client=tv_embedded,mediaconnect',
];

// ── Helpers ───────────────────────────────────────────────────

/** Returns true if the string looks like a YouTube URL. */
function isYouTubeUrl(str) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch|shorts)|youtu\.be)\/.+/.test(str);
}

/**
 * Fetch title + canonical URL via yt-dlp --dump-json.
 * Uses the tv_embedded client so it never hits bot-detection.
 */
function getVideoInfo(url) {
  return new Promise((resolve, reject) => {
    let json = '';
    const proc = spawn(YT_DLP, [
      '--no-playlist',
      ...YT_CLIENT_ARGS,
      '--dump-json',
      '--no-warnings',
      url,
    ]);

    proc.stdout.on('data', (d) => { json += d.toString(); });
    proc.stderr.on('data', (d) => {
      const line = d.toString().trim();
      if (line.includes('ERROR')) console.error('[yt-dlp/info]', line);
    });
    proc.on('close', (code) => {
      if (code !== 0 || !json.trim()) {
        return reject(new Error('yt-dlp could not fetch video info (bot detection or invalid URL)'));
      }
      try {
        const data = JSON.parse(json.trim());
        resolve({ title: data.title ?? url, url: data.webpage_url ?? url });
      } catch {
        reject(new Error('Failed to parse yt-dlp JSON output'));
      }
    });
    proc.on('error', reject);
  });
}

/**
 * Resolve a query (URL or search terms) → { title, url }.
 */
async function resolve(query) {
  if (isYouTubeUrl(query)) {
    return getVideoInfo(query);
  }
  // Text search: youtube-sr finds the top match, then we verify via yt-dlp
  const video = await YouTube.searchOne(query);
  if (!video?.url) throw new Error(`No YouTube results found for: ${query}`);
  // Return search result directly — title from youtube-sr is reliable enough
  // and saves one round-trip for the user.
  return { title: video.title ?? 'Unknown Title', url: video.url };
}

// ── Command definition ────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('🎵 Music player controls')
    .addSubcommand((s) =>
      s.setName('play')
        .setDescription('Play a song by YouTube URL or search query')
        .addStringOption((o) =>
          o.setName('query').setDescription('YouTube URL or search terms').setRequired(true).setMaxLength(500)
        ))
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
          o.setName('percent').setDescription('Volume percentage').setRequired(true).setMinValue(1).setMaxValue(100)
        )),

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

    // ── play ──────────────────────────────────────────────────
    if (sub === 'play') {
      await interaction.deferReply();
      const query = interaction.options.getString('query', true);

      try {
        const { title, url } = await resolve(query);
        const songInfo = { title, url, requestedBy: interaction.user.tag };

        // play() joins VC and begins streaming; may take a second or two
        await musicPlayer.play(guildId, voiceChannel, interaction.channel, songInfo);

        const current  = musicPlayer.getCurrent(guildId);
        // If something else is already playing, this song was queued
        const isQueued = current !== null && current.url !== url;
        const queueLen = musicPlayer.getQueueList(guildId).length;

        return interaction.editReply({
          embeds: [createEmbed({
            title:       isQueued ? '📥 Added to Queue' : '▶️ Now Playing',
            description: `**[${title}](${url})**`,
            fields: [
              { name: '📢 Channel',      value: voiceChannel.name,              inline: true },
              { name: '👤 Requested by', value: songInfo.requestedBy,           inline: true },
              { name: '🎵 Position',     value: isQueued ? `#${queueLen}` : 'Now', inline: true },
            ],
          })],
        });
      } catch (err) {
        console.error('[Music:play]', err.message);
        return interaction.editReply({
          embeds: [errorEmbed(
            `Could not play that track.\n\`${err.message.slice(0, 300)}\``
          )],
        });
      }
    }

    // ── stop ──────────────────────────────────────────────────
    if (sub === 'stop') {
      musicPlayer.destroyQueue(guildId);
      return interaction.reply({ embeds: [successEmbed('Stopped playback and disconnected.', '⏹️ Stopped')] });
    }

    // ── skip ──────────────────────────────────────────────────
    if (sub === 'skip') {
      if (!musicPlayer.skip(guildId))
        return interaction.reply({ embeds: [errorEmbed('Nothing is currently playing.')], flags: 64 });
      return interaction.reply({ embeds: [successEmbed('Skipped the current song.', '⏭️ Skipped')] });
    }

    // ── pause ─────────────────────────────────────────────────
    if (sub === 'pause') {
      if (!musicPlayer.pause(guildId))
        return interaction.reply({ embeds: [errorEmbed('Nothing is playing or already paused.')], flags: 64 });
      return interaction.reply({ embeds: [successEmbed('Playback paused.', '⏸️ Paused')] });
    }

    // ── resume ────────────────────────────────────────────────
    if (sub === 'resume') {
      if (!musicPlayer.resume(guildId))
        return interaction.reply({ embeds: [errorEmbed('Nothing is paused.')], flags: 64 });
      return interaction.reply({ embeds: [successEmbed('Playback resumed.', '▶️ Resumed')] });
    }

    // ── queue ─────────────────────────────────────────────────
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

    // ── nowplaying ────────────────────────────────────────────
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

    // ── volume ────────────────────────────────────────────────
    if (sub === 'volume') {
      const percent = interaction.options.getInteger('percent', true);
      if (!musicPlayer.setVolume(guildId, percent))
        return interaction.reply({ embeds: [errorEmbed('Nothing is currently playing.')], flags: 64 });
      return interaction.reply({ embeds: [successEmbed(`Volume set to **${percent}%**.`, '🔊 Volume')] });
    }
  },
};
