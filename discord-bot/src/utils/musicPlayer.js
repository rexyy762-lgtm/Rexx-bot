// ============================================================
// utils/musicPlayer.js — Per-guild music queue & voice management
//
// Audio pipeline
// ──────────────
//   Stage 1  yt-dlp --get-url
//     Resolves the signed googlevideo.com CDN URL.  Uses the
//     tv_embedded / mediaconnect ANDROID_VR client which works
//     without PO tokens on GCP IPs — as long as the video has
//     not been rate-limited for this IP.
//
//   Stage 2  FFmpeg HTTP → raw PCM
//     FFmpeg fetches the CDN URL (normal HTTP, not yt-dlp's
//     downloader) and pipes s16le/48 kHz/stereo PCM to
//     @discordjs/voice → Opus encoder → Discord.
//
// YouTube rate-limiting
// ─────────────────────
//   YouTube blocks specific video IDs per-IP after repeated
//   failed requests.  The permanent fix is authenticated cookies:
//
//   1. Sign into YouTube in Chrome/Firefox
//   2. Install the "Get cookies.txt LOCALLY" browser extension
//      https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc
//   3. Click the extension on youtube.com → Export → "For current site"
//   4. Copy the entire file contents
//   5. In Replit → Secrets → add  YOUTUBE_COOKIES  with that value
//   6. Restart the Discord Bot workflow
//
//   With cookies loaded the bot uses authenticated sessions and
//   YouTube never rate-limits it.
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
const { spawn }  = require('child_process');
const { writeFileSync, existsSync } = require('fs');
const path = require('path');

// ── Paths ──────────────────────────────────────────────────────
const YT_DLP      = path.join(__dirname, '../../bin/yt-dlp');
const FFMPEG      = process.env.FFMPEG_PATH ?? 'ffmpeg';
const COOKIE_FILE = '/tmp/yt-cookies.txt';

// ── Cookie setup (runs once at module load) ─────────────────────
let cookiesReady = false;

(function setupCookies() {
  const raw = process.env.YOUTUBE_COOKIES;
  if (!raw || !raw.trim()) return;
  try {
    // Ensure Netscape header so yt-dlp parses the file correctly
    const content = raw.trim().startsWith('#')
      ? raw.trim()
      : `# Netscape HTTP Cookie File\n${raw.trim()}`;
    writeFileSync(COOKIE_FILE, content + '\n', 'utf8');
    cookiesReady = true;
    console.log('[Music] ✅ YouTube cookies loaded — authenticated mode active');
  } catch (err) {
    console.warn('[Music] ⚠️  Could not write cookie file:', err.message);
  }
})();

// ── yt-dlp helpers ─────────────────────────────────────────────

/** Returns the yt-dlp args that are common to every invocation. */
function baseYtArgs() {
  const args = [
    '--no-playlist',
    '--extractor-args', 'youtube:player_client=tv_embedded,mediaconnect',
    '--no-warnings',
    '--no-cache-dir',
  ];
  if (cookiesReady) args.push('--cookies', COOKIE_FILE);
  return args;
}

/**
 * Stage 1 — ask yt-dlp for the signed CDN URL.
 * Only makes a lightweight YouTube API call; no audio bytes are downloaded.
 *
 * @param {string} videoUrl
 * @returns {Promise<string>}
 */
function resolveCdnUrl(videoUrl) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP, [
      ...baseYtArgs(),
      '-f', 'bestaudio[ext=m4a]/bestaudio/best',
      '--get-url',
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
      const url = stdout.trim().split('\n')[0]?.trim();
      if (code !== 0 || !url) {
        // Build a human-readable error that shows up in Discord
        const raw = stderr.trim().replace(/\n/g, ' ').slice(0, 400);
        const isRateLimit = raw.includes('Sign in') || raw.includes('bot');
        const msg = isRateLimit
          ? `YouTube blocked this video from the server's IP (rate-limited). ` +
            `Try a different song, or fix permanently by adding a YOUTUBE_COOKIES secret — ` +
            `run \`/music setup\` in Discord for instructions.`
          : raw || `yt-dlp exited with code ${code}`;
        return reject(new Error(msg));
      }
      resolve(url);
    });

    proc.on('error', (err) =>
      reject(new Error(`yt-dlp spawn failed: ${err.message}`))
    );
  });
}

/**
 * Stage 2 — FFmpeg fetches the CDN URL and transcodes to
 * raw s16le PCM at 48 kHz / stereo (StreamType.Raw).
 *
 * @param {string} cdnUrl
 * @returns {{ proc: import('child_process').ChildProcess, stream: NodeJS.ReadableStream }}
 */
function spawnFfmpeg(cdnUrl) {
  const proc = spawn(FFMPEG, [
    '-reconnect',           '1',
    '-reconnect_streamed',  '1',
    '-reconnect_delay_max', '5',
    '-i',  cdnUrl,
    '-vn',
    '-f',  's16le',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  proc.stderr.on('data', (d) => {
    const msg = d.toString();
    if (
      (msg.includes('Error') || msg.includes('Invalid')) &&
      !msg.includes('past duration') &&
      !msg.includes('non monotonous')
    ) {
      console.error('[FFmpeg]', msg.trim().slice(0, 200));
    }
  });

  proc.on('error', (err) => console.error('[FFmpeg] spawn error:', err.message));
  return { proc, stream: proc.stdout };
}

// ── GuildQueue ─────────────────────────────────────────────────

/** @type {Map<string, GuildQueue>} */
const queues = new Map();

class GuildQueue {
  constructor() {
    this.songs       = [];   // Array<{ title, url, requestedBy }>
    this.player      = createAudioPlayer();
    this.connection  = null;
    this.volume      = 1.0;
    this.current     = null;
    this.textChannel = null;
    this._proc       = null; // active FFmpeg child process
  }
}

// ── Internal: advance the queue ────────────────────────────────

async function _playNext(guildId) {
  const q = queues.get(guildId);
  if (!q) return;

  if (q.songs.length === 0) {
    setTimeout(() => destroyQueue(guildId), 30_000);
    return;
  }

  q.current = q.songs.shift();

  try {
    const cdnUrl = await resolveCdnUrl(q.current.url);
    const { proc, stream } = spawnFfmpeg(cdnUrl);
    q._proc = proc;

    const resource = createAudioResource(stream, {
      inputType:    StreamType.Raw,
      inlineVolume: true,
    });
    resource.volume?.setVolume(q.volume);
    q.player.play(resource);

    q.player.once(AudioPlayerStatus.Idle, () => {
      try { proc.kill('SIGKILL'); } catch {}
      _playNext(guildId);
    });

    console.log(`[Music] ▶ Now playing: ${q.current.title}`);
    q.textChannel?.send(`▶️ **Now playing:** ${q.current.title}`).catch(() => {});

  } catch (err) {
    console.error(`[Music] Failed to play "${q.current?.title}":`, err.message);

    const isRateLimit = err.message.includes('rate-limited') ||
                        err.message.includes('Sign in') ||
                        err.message.includes('bot');

    const userMsg = isRateLimit
      ? `⚠️ **${q.current?.title}** — skipped.\n` +
        `> YouTube blocked this video from the bot's IP.\n` +
        `> **Try a different song** — most songs work fine.\n` +
        `> **Permanent fix:** add your YouTube cookies as a Replit secret.\n` +
        `> See \`/music setup\` for step-by-step instructions.`
      : `⚠️ Could not play **${q.current?.title}** — skipping.\n\`${err.message.slice(0, 200)}\``;

    q.textChannel?.send(userMsg).catch(() => {});
    _playNext(guildId);
  }
}

// ── Public API ──────────────────────────────────────────────────

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

function hasCookies()    { return cookiesReady; }
function getCurrent(guildId)   { return queues.get(guildId)?.current ?? null; }
function getQueueList(guildId) { return queues.get(guildId)?.songs   ?? []; }
function isPaused(guildId) {
  return queues.get(guildId)?.player.state.status === AudioPlayerStatus.Paused;
}

module.exports = {
  play, skip, pause, resume, setVolume,
  getCurrent, getQueueList, isPaused,
  destroyQueue, hasCookies,
};
