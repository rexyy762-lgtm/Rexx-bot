// ============================================================
// utils/musicPlayer.js — Per-guild music queue & voice management
// Uses yt-dlp (native binary) piped into @discordjs/voice via FFmpeg.
// No Python, no broken decipher hacks — yt-dlp handles everything.
// ============================================================

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
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

/** Map<guildId, GuildQueue> */
const queues = new Map();

class GuildQueue {
  constructor() {
    this.songs   = [];    // [{ title, url, requestedBy }]
    this.player  = createAudioPlayer();
    this.connection = null;
    this.volume  = 1.0;
    this.current = null;
    this.textChannel = null;
    this._currentProcess = null; // track spawned yt-dlp process
  }
}

// ── Helpers ───────────────────────────────────────────────────

/**
 * Spawn yt-dlp → pipe its best-audio stream → return a Node.js Readable
 * that @discordjs/voice can consume directly via FFmpeg.
 */
function createYtDlpStream(url) {
  // yt-dlp writes the raw audio to stdout; FFmpeg re-encodes to PCM/Opus
  const proc = spawn(YT_DLP, [
    '--no-playlist',
    '-f', 'bestaudio[ext=webm]/bestaudio/best',
    '--no-cache-dir',
    '-o', '-',   // pipe to stdout
    url,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  proc.stderr.on('data', (d) => {
    const msg = d.toString();
    // Only log actual errors, not yt-dlp progress lines
    if (msg.includes('ERROR') || msg.includes('error')) {
      console.error('[yt-dlp]', msg.trim());
    }
  });

  return { stream: proc.stdout, proc };
}

// ── Public API ────────────────────────────────────────────────

function getQueue(guildId) {
  if (!queues.has(guildId)) queues.set(guildId, new GuildQueue());
  return queues.get(guildId);
}

function destroyQueue(guildId) {
  const q = queues.get(guildId);
  if (!q) return;
  try { q._currentProcess?.kill('SIGKILL'); } catch {}
  q.player.stop(true);
  try { q.connection?.destroy(); } catch {}
  queues.delete(guildId);
}

/**
 * Join voice and enqueue a song. Starts playback immediately if idle.
 */
async function play_(guildId, voiceChannel, textChannel, song) {
  const q = getQueue(guildId);
  q.textChannel = textChannel;
  q.songs.push(song);

  if (!q.connection) {
    q.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

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
    _playNext(guildId);
  }
}

/**
 * Internal: pull the next song off the queue and stream it.
 */
async function _playNext(guildId) {
  const q = queues.get(guildId);
  if (!q) return;

  if (q.songs.length === 0) {
    setTimeout(() => destroyQueue(guildId), 30_000);
    return;
  }

  q.current = q.songs.shift();

  try {
    const { stream, proc } = createYtDlpStream(q.current.url);
    q._currentProcess = proc;

    proc.on('error', (err) => {
      console.error(`[Music] yt-dlp process error for "${q.current?.title}":`, err.message);
    });

    // @discordjs/voice accepts any Readable with StreamType.Arbitrary;
    // it will internally pass it through FFmpeg → Opus encoder.
    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true,
    });
    resource.volume?.setVolume(q.volume);

    q.player.play(resource);
    q.player.once(AudioPlayerStatus.Idle, () => {
      try { proc.kill('SIGKILL'); } catch {}
      _playNext(guildId);
    });

    console.log(`[Music] ▶ Now playing: ${q.current.title}`);
  } catch (err) {
    console.error(`[Music] Failed to start "${q.current?.title}":`, err.message);
    q.textChannel?.send(`⚠️ Could not play **${q.current?.title}** — skipping.`).catch(() => {});
    _playNext(guildId);
  }
}

function skip(guildId) {
  const q = queues.get(guildId);
  if (!q) return false;
  try { q._currentProcess?.kill('SIGKILL'); } catch {}
  q.player.stop();
  return true;
}

function pause(guildId) {
  const q = queues.get(guildId);
  if (!q) return false;
  return q.player.pause();
}

function resume(guildId) {
  const q = queues.get(guildId);
  if (!q) return false;
  return q.player.unpause();
}

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

module.exports = { play: play_, skip, pause, resume, setVolume, getCurrent, getQueueList, isPaused, destroyQueue };
