// ============================================================
// utils/musicPlayer.js — Per-guild music queue & voice management
//
// Two-stage audio pipeline (solves YouTube bot-detection):
//
//   Stage 1 – yt-dlp --get-url
//     yt-dlp resolves the signed googlevideo.com CDN URL using the
//     tv_embedded / mediaconnect client.  It only makes a lightweight
//     API call — it never downloads audio bytes, so YouTube's download
//     bot-detector never fires.
//
//   Stage 2 – FFmpeg HTTP → PCM pipe
//     FFmpeg fetches the CDN URL directly (looks like a normal browser
//     request), transcodes to raw s16le PCM at 48 kHz / stereo, and
//     pipes the bytes to @discordjs/voice, which Opus-encodes them for
//     Discord.  FFmpeg's reconnect flags handle transient CDN errors.
//
// Tested July 2026 on Replit GCP IPs.
// ============================================================
'use strict';

const {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} = require('@discordjs/voice');
const { spawn } = require('child_process');
const path = require('path');

// ── Paths ─────────────────────────────────────────────────────
const YT_DLP = path.join(__dirname, '../../bin/yt-dlp');
const FFMPEG  = process.env.FFMPEG_PATH ?? 'ffmpeg';

// Player clients that work without PO tokens or cookies on GCP IPs
const YT_CLIENT_ARGS = [
  '--extractor-args', 'youtube:player_client=tv_embedded,mediaconnect',
];

/** @type {Map<string, GuildQueue>} */
const queues = new Map();

// ── GuildQueue ────────────────────────────────────────────────

class GuildQueue {
  constructor() {
    this.songs        = [];    // Array<{ title, url, requestedBy }>
    this.player       = createAudioPlayer();
    this.connection   = null;
    this.volume       = 1.0;
    this.current      = null;
    this.textChannel  = null;
    this._proc        = null;  // active FFmpeg child process
  }
}

// ── Stage 1: URL resolution ───────────────────────────────────

/**
 * Asks yt-dlp to resolve the signed googlevideo CDN URL for a video.
 * Only makes lightweight YouTube API calls — never downloads audio bytes.
 *
 * @param {string} videoUrl  YouTube watch / shorts URL
 * @returns {Promise<string>} Direct CDN URL ready for FFmpeg
 */
function resolveCdnUrl(videoUrl) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP, [
      '--no-playlist',
      ...YT_CLIENT_ARGS,
      '-f', 'bestaudio[ext=m4a]/bestaudio/best',
      '--no-warnings',
      '--get-url',          // print CDN URL(s), do NOT download
      videoUrl,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
      const line = d.toString().trim();
      if (line.startsWith('ERROR')) console.error('[yt-dlp]', line);
    });

    proc.on('close', (code) => {
      // --get-url may return multiple lines (one per format); take the first
      const url = stdout.trim().split('\n')[0]?.trim();
      if (code !== 0 || !url) {
        return reject(new Error(
          stderr.trim().replace(/\n/g, ' ').slice(0, 300) ||
          `yt-dlp exited with code ${code}`
        ));
      }
      resolve(url);
    });

    proc.on('error', (err) =>
      reject(new Error(`yt-dlp spawn failed: ${err.message}`))
    );
  });
}

// ── Stage 2: FFmpeg stream ────────────────────────────────────

/**
 * Spawns FFmpeg to download the signed CDN URL and transcode it to
 * raw signed-16-bit little-endian PCM at 48 kHz stereo (StreamType.Raw).
 *
 * @param {string} cdnUrl  Signed googlevideo.com URL from Stage 1
 * @returns {{ proc: ChildProcess, stream: Readable }}
 */
function spawnFfmpeg(cdnUrl) {
  const proc = spawn(FFMPEG, [
    // HTTP reconnect — handles CDN hiccups without stopping playback
    '-reconnect',            '1',
    '-reconnect_streamed',   '1',
    '-reconnect_delay_max',  '5',
    // Input: the signed CDN URL
    '-i', cdnUrl,
    // Output: raw PCM that @discordjs/voice (StreamType.Raw) expects
    '-vn',                    // strip video
    '-f',    's16le',         // signed 16-bit little-endian
    '-ar',   '48000',         // 48 kHz — Discord's native sample rate
    '-ac',   '2',             // stereo
    'pipe:1',                 // write to stdout
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  proc.stderr.on('data', (d) => {
    const msg = d.toString();
    // FFmpeg sends progress to stderr; only surface real errors
    if (
      (msg.includes('Error') || msg.includes('Invalid')) &&
      !msg.includes('past duration') &&
      !msg.includes('non monotonous')
    ) {
      console.error('[FFmpeg]', msg.trim().slice(0, 200));
    }
  });

  proc.on('error', (err) => {
    console.error('[FFmpeg] Spawn error:', err.message);
  });

  return { proc, stream: proc.stdout };
}

// ── Internal: advance the queue ───────────────────────────────

async function _playNext(guildId) {
  const q = queues.get(guildId);
  if (!q) return;

  if (q.songs.length === 0) {
    // Leave voice after 30 s of silence
    setTimeout(() => destroyQueue(guildId), 30_000);
    return;
  }

  q.current = q.songs.shift();

  try {
    // Stage 1 — resolve the CDN URL (fast, ~0.5–1 s)
    const cdnUrl = await resolveCdnUrl(q.current.url);

    // Stage 2 — stream via FFmpeg
    const { proc, stream } = spawnFfmpeg(cdnUrl);
    q._proc = proc;

    // StreamType.Raw = s16le PCM @ 48000/2ch — @discordjs/voice Opus-encodes it
    const resource = createAudioResource(stream, {
      inputType:    StreamType.Raw,
      inlineVolume: true,
    });
    resource.volume?.setVolume(q.volume);

    q.player.play(resource);

    // When the current track ends, advance
    q.player.once(AudioPlayerStatus.Idle, () => {
      try { proc.kill('SIGKILL'); } catch {}
      _playNext(guildId);
    });

    console.log(`[Music] ▶ Now playing: ${q.current.title}`);
    q.textChannel
      ?.send(`▶️ **Now playing:** ${q.current.title}`)
      .catch(() => {});

  } catch (err) {
    console.error(`[Music] Failed to play "${q.current?.title}":`, err.message);
    q.textChannel
      ?.send(`⚠️ Could not play **${q.current?.title}** — skipping.\n\`${err.message.slice(0, 200)}\``)
      .catch(() => {});
    // Skip to the next song
    _playNext(guildId);
  }
}

// ── Public API ────────────────────────────────────────────────

function getQueue(guildId) {
  if (!queues.has(guildId)) queues.set(guildId, new GuildQueue());
  return queues.get(guildId);
}

function destroyQueue(guildId) {
  const q = queues.get(guildId);
  if (!q) return;
  try { q._proc?.kill('SIGKILL'); } catch {}
  q.player.stop(true);
  try { q.connection?.destroy(); } catch {}
  queues.delete(guildId);
}

/**
 * Join voice and enqueue a song.  Starts playback immediately if idle.
 *
 * @param {string}                         guildId
 * @param {import('discord.js').VoiceChannel} voiceChannel
 * @param {import('discord.js').TextChannel}  textChannel
 * @param {{ title: string, url: string, requestedBy: string }} song
 */
async function play(guildId, voiceChannel, textChannel, song) {
  const q = getQueue(guildId);
  q.textChannel = textChannel;
  q.songs.push(song);

  if (!q.connection) {
    q.connection = joinVoiceChannel({
      channelId:      voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    // Reconnect gracefully on unexpected disconnect
    q.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(q.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(q.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        destroyQueue(guildId);
      }
    });

    q.connection.subscribe(q.player);
    await _playNext(guildId);
  }
}

function skip(guildId) {
  const q = queues.get(guildId);
  if (!q) return false;
  try { q._proc?.kill('SIGKILL'); } catch {}
  q.player.stop();
  return true;
}

function pause(guildId)  { return queues.get(guildId)?.player.pause()   ?? false; }
function resume(guildId) { return queues.get(guildId)?.player.unpause() ?? false; }

function setVolume(guildId, percent) {
  const q = queues.get(guildId);
  if (!q) return false;
  q.volume = Math.max(0, Math.min(1, percent / 100));
  const resource = q.player.state?.resource;
  resource?.volume?.setVolume(q.volume);
  return true;
}

function getCurrent(guildId)   { return queues.get(guildId)?.current ?? null; }
function getQueueList(guildId) { return queues.get(guildId)?.songs   ?? []; }
function isPaused(guildId) {
  return queues.get(guildId)?.player.state.status === AudioPlayerStatus.Paused;
}

module.exports = {
  play,
  skip,
  pause,
  resume,
  setVolume,
  getCurrent,
  getQueueList,
  isPaused,
  destroyQueue,
};
