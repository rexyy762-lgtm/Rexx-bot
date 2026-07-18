// ============================================================
// commands/music/music.js — Music player slash command
// Search: youtube-sr  |  Metadata: yt-dlp --dump-json
// Stream: yt-dlp piped through @discordjs/voice FFmpeg encoder
// ============================================================

const { SlashCommandBuilder } = require('discord.js');
const { spawn } = require('child_process');
const path = require('path');
const YouTube = require('youtube-sr').default;
const musicPlayer = require('../../utils/musicPlayer');
const { createEmbed, successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');

const YT_DLP = path.join(__dirname, '../../../bin/yt-dlp');

// ── Helpers ───────────────────────────────────────────────────

/** True if the string looks like a YouTube video URL. */
function isYouTubeUrl(str) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch|shorts)|youtu\.be)\/.+/.test(str);
}

/**
 * Get video title + canonical URL via yt-dlp --dump-json.
 * Falls back to the raw URL as title on error.
 */
function getVideoInfo(url) {
  return new Promise((resolve, reject) => {
    let json = '';
    const proc = spawn(YT_DLP, ['--no-playlist', '--dump-json', '--no-warnings', url]);
    proc.stdout.on('data', d => { json += d.toString(); });
    proc.stderr.on('data', () => {}); // suppress warnings
    proc.on('close', code => {
      if (code !== 0 || !json.trim()) return reject(new Error('yt-dlp returned no info'));
      try {
        const data = JSON.parse(json.trim());
        resolve({ title: data.title ?? url, url: data.webpage_url ?? url });
      } catch {
        reject(new Error('Failed to parse yt-dlp JSON'));
      }
    });
    proc.on('error', reject);
  });
}

/**
 * Resolve a query (YouTube URL or search terms) → { title, url }.
 */
async function resolve(query) {
  if (isYouTubeUrl(query)) {
    return getVideoInfo(query);
  }
  // Search YouTube, then get canonical info for the top result
  const video = await YouTube.searchOne(query);
  if (!video?.url) throw new Error(`No results found for: ${query}`);
  return { title: video.title ?? 'Unknown Title', url: video.url };
}

// ── Command definition ────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('🎵 Music player controls')
    .addSubcommand(sub =>
      sub.setName('play')
        .setDescription('Play a song by YouTube URL or search query')
        .addStringOption(opt =>
          opt.setName('query').setDescription('YouTube URL or search terms').setRequired(true).setMaxLength(500)
        )
    )
    .addSubcommand(sub => sub.setName('stop').setDescription('Stop playback and disconnect'))
    .addSubcommand(sub => sub.setName('skip').setDescription('Skip the current song'))
    .addSubcommand(sub => sub.setName('pause').setDescription('Pause playback'))
    .addSubcommand(sub => sub.setName('resume').setDescription('Resume paused playback'))
    .addSubcommand(sub => sub.setName('queue').setDescription('Show the upcoming queue'))
    .addSubcommand(sub => sub.setName('nowplaying').setDescription('Show currently playing song'))
    .addSubcommand(sub =>
      sub.setName('volume')
        .setDescription('Set playback volume (1–100)')
        .addIntegerOption(opt =>
          opt.setName('percent').setDescription('Volume percentage').setRequired(true).setMinValue(1).setMaxValue(100)
        )
    ),

  async execute(interaction) {
    const sub      = interaction.options.getSubcommand();
    const guildId  = interaction.guild.id;
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

        await musicPlayer.play(guildId, voiceChannel, interaction.channel, songInfo);

        const current  = musicPlayer.getCurrent(guildId);
        const isQueued = current !== null && current.url !== url;

        await interaction.editReply({
          embeds: [createEmbed({
            title: isQueued ? '📥 Added to Queue' : '▶️ Now Playing',
            description: `**[${title}](${url})**`,
            fields: [
              { name: '📢 Channel',      value: voiceChannel.name,       inline: true },
              { name: '👤 Requested by', value: songInfo.requestedBy,    inline: true },
              { name: '🎵 Position',     value: isQueued ? `#${musicPlayer.getQueueList(guildId).length}` : 'Up next', inline: true },
            ],
          })],
        });
      } catch (err) {
        console.error('[Music:play]', err);
        await interaction.editReply({
          embeds: [errorEmbed(`Could not play that track: ${err.message}`)],
        });
      }
    }

    // ── stop ──────────────────────────────────────────────────
    else if (sub === 'stop') {
      musicPlayer.destroyQueue(guildId);
      await interaction.reply({ embeds: [successEmbed('Stopped playback and disconnected.', '⏹️ Stopped')] });
    }

    // ── skip ──────────────────────────────────────────────────
    else if (sub === 'skip') {
      if (!musicPlayer.skip(guildId))
        return interaction.reply({ embeds: [errorEmbed('Nothing is currently playing.')], flags: 64 });
      await interaction.reply({ embeds: [successEmbed('Skipped the current song.', '⏭️ Skipped')] });
    }

    // ── pause ─────────────────────────────────────────────────
    else if (sub === 'pause') {
      if (!musicPlayer.pause(guildId))
        return interaction.reply({ embeds: [errorEmbed('Nothing is playing or already paused.')], flags: 64 });
      await interaction.reply({ embeds: [successEmbed('Playback paused.', '⏸️ Paused')] });
    }

    // ── resume ────────────────────────────────────────────────
    else if (sub === 'resume') {
      if (!musicPlayer.resume(guildId))
        return interaction.reply({ embeds: [errorEmbed('Nothing is paused.')], flags: 64 });
      await interaction.reply({ embeds: [successEmbed('Playback resumed.', '▶️ Resumed')] });
    }

    // ── queue ─────────────────────────────────────────────────
    else if (sub === 'queue') {
      const current = musicPlayer.getCurrent(guildId);
      const queue   = musicPlayer.getQueueList(guildId);
      if (!current)
        return interaction.reply({ embeds: [infoEmbed('The queue is empty.', '📋 Queue')] });

      const lines = queue.slice(0, 10).map(
        (s, i) => `**${i + 1}.** [${s.title}](${s.url}) — *${s.requestedBy}*`
      );
      await interaction.reply({
        embeds: [createEmbed({
          title: '📋 Music Queue',
          fields: [
            { name: '▶️ Now Playing', value: `[${current.title}](${current.url})`, inline: false },
            ...(lines.length ? [{ name: `⏭️ Up Next (${queue.length})`, value: lines.join('\n'), inline: false }] : []),
          ],
        })],
      });
    }

    // ── nowplaying ────────────────────────────────────────────
    else if (sub === 'nowplaying') {
      const current = musicPlayer.getCurrent(guildId);
      if (!current)
        return interaction.reply({ embeds: [infoEmbed('Nothing is currently playing.', '🎵 Now Playing')] });

      await interaction.reply({
        embeds: [createEmbed({
          title: musicPlayer.isPaused(guildId) ? '⏸️ Paused' : '▶️ Now Playing',
          description: `**[${current.title}](${current.url})**`,
          fields: [{ name: '👤 Requested by', value: current.requestedBy, inline: true }],
        })],
      });
    }

    // ── volume ────────────────────────────────────────────────
    else if (sub === 'volume') {
      const percent = interaction.options.getInteger('percent', true);
      if (!musicPlayer.setVolume(guildId, percent))
        return interaction.reply({ embeds: [errorEmbed('Nothing is currently playing.')], flags: 64 });
      await interaction.reply({ embeds: [successEmbed(`Volume set to **${percent}%**.`, '🔊 Volume')] });
    }
  },
};
