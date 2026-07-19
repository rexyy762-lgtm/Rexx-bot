// ============================================================
// utils/musicPlayer.js — Per-guild music queue & voice management
//
// YouTube bypass strategy (tested July 2026):
//   --extractor-args "youtube:player_client=tv_embedded,mediaconnect"
//   Both clients return signed audio/mp4 stream URLs without cookies or
//   PO tokens.  (ios/mweb/web_creator all fail on Replit IPs.)
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
const FFMPEG  = process.env.FFMPEG_PATH || 'ffmpeg';

// Shared yt-dlp flags that bypass YouTube bot detection on server IPs
const YT_CLIENT_ARGS = [
  '--extractor-args', 'youtube:player_client=tv_embedded,mediaconnect',
];

/** Map<guildId, GuildQueue> */
const queues = new Map();

// ── GuildQueue ────────────────────────────────────────────────

class GuildQueue {
  constructor() {
    this.songs          = [];   // [{ title, url, requestedBy }]
    this.player         = createAudioPlayer();
    this.connection     = null;
    this.volume         = 1.0;
    this.current        = null;
    this.textChannel    = null;
    this._currentProc   = null; // active yt-dlp child process
  }
}

// ── Stream creation ───────────────────────────────────────────

/**
 * Spawns yt-dlp piped to stdout and returns a Promise that:
 *   • resolves with { stream, proc } once the first data chunk arrives
 *     (confirming yt-dlp is actually sending audio)
 *   • rejects with a descriptive Error if yt-dlp exits non-zero before
 *     any data, so callers can skip cleanly instead of getting silence.
 */
function createYtDlpStream(url) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP, [
      '--no-playlist',
      ...YT_CLIENT_ARGS,
      // Prefer m4a (AAC) — what tv_embedded/mediaconnect actually serve;
      // fall back to any best audio if needed.
      '-f', 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best',
      '--no-cache-dir',
      '--no-warnings',
      '-o', '-',           // pipe raw audio to stdout
      url,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let errBuf   = '';
    let resolved = false;

    proc.stderr.on('data', (chunk) => {
      errBuf += chunk.toString();
      // Surface real errors immediately
      const line = chunk.toString().trim();
      if (line.includes('ERROR')) console.error('[yt-dlp]', line);
    });

    // First stdout data → stream is live, hand it off
    proc.stdout.once('data', () => {
      resolved = true;
      resolve({ stream: proc.stdout, proc });
    });

    // Process closed before any data arrived → reject with yt-dlp's message
    proc.once('close', (code) => {
      if (!resolved && code !== 0) {
        const msg = errBuf.trim() || `yt-dlp exited with code ${code}`;
        reject(new Error(msg));
      }
    });

    proc.once('error', (err) => {
      if (!resolved) reject(err);
    });
  });
}

// ── Internal playback ─────────────────────────────────────────

async function _playNext(guildId) {
  const q = queues.get(guildId);
  if (!q) return;

  if (q.songs.length === 0) {
    // Auto-disconnect after 30 s of silence
    setTimeout(() => destroyQueue(guildId), 30_000);
    return;
  }

  q.current = q.songs.shift();

  try {
    const { stream, proc } = await createYtDlpStream(q.current.url);
    q._currentProc = proc;

    // @discordjs/voice pipes StreamType.Arbitrary through its internal FFmpeg
    // → Opus encoder automatically, so we don't need to run FFmpeg ourselves.
    const resource = createAudioResource(stream, {
      inputType:    StreamType.Arbitrary,
      inlineVolume: true,
    });
    resource.volume?.setVolume(q.volume);

    q.player.play(resource);

    // When this track finishes, advance the queue
    q.player.once(AudioPlayerStatus.Idle, () => {
      try { proc.kill('SIGKILL'); } catch {}
      _playNext(guildId);
    });

    console.log(`[Music] ▶ Now playing: ${q.current.title}`);

    // Announce in text channel if available
    q.textChannel?.send(`▶️ **Now playing:** ${q.current.title}`).catch(() => {});

  } catch (err) {
    console.error(`[Music] Failed to stream "${q.current?.title}":`, err.message);
    q.textChannel?.send(
      `⚠️ Could not play **${q.current?.title}** — skipping.\n\`${err.message.slice(0, 200)}\``
    ).catch(() => {});
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
  try { q._currentProc?.kill('SIGKILL'); } catch {}
  q.player.stop(true);
  try { q.connection?.destroy(); } catch {}
  queues.delete(guildId);
}

/**
 * Join voice and enqueue a song.  Starts playback immediately if idle.
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

    // Handle unexpected disconnects gracefully
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
  try { q._currentProc?.kill('SIGKILL'); } catch {}
  q.player.stop();
  return true;
}

function pause(guildId) {
  return queues.get(guildId)?.player.pause() ?? false;
}

function resume(guildId) {
  return queues.get(guildId)?.player.unpause() ?? false;
}

function setVolume(guildId, percent) {
  const q = queues.get(guildId);
  if (!q) return false;
  q.volume = Math.max(0, Math.min(1, percent / 100));
  const resource = q.player.state?.resource;
  resource?.volume?.setVolume(q.volume);
  return true;
}

function getCurrent(guildId)   { return queues.get(guildId)?.current  ?? null; }
function getQueueList(guildId) { return queues.get(guildId)?.songs     ?? []; }
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
