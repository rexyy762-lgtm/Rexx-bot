// ============================================================
// utils/musicPlayer.js — Per-guild music queue & voice management
// ============================================================

const {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');
const play = require('play-dl');

/** Map<guildId, GuildQueue> */
const queues = new Map();

class GuildQueue {
  constructor() {
    this.songs = [];           // [{ title, url, requestedBy }]
    this.player = createAudioPlayer();
    this.connection = null;
    this.volume = 1.0;         // 0.0 – 1.0
    this.current = null;       // currently playing song
    this.textChannel = null;   // channel to send now-playing messages
  }
}

// ── Public API ────────────────────────────────────────────────

/**
 * Get or create the GuildQueue for a guild.
 */
function getQueue(guildId) {
  if (!queues.has(guildId)) queues.set(guildId, new GuildQueue());
  return queues.get(guildId);
}

/**
 * Destroy the queue for a guild (disconnect + cleanup).
 */
function destroyQueue(guildId) {
  const q = queues.get(guildId);
  if (!q) return;
  q.player.stop();
  try { q.connection?.destroy(); } catch { /* already gone */ }
  queues.delete(guildId);
}

/**
 * Join a voice channel and start playing the queue.
 * @param {import('discord.js').VoiceChannel} voiceChannel
 * @param {import('discord.js').TextChannel} textChannel
 * @param {{ title, url, requestedBy }} song
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

    // Disconnect the bot if the connection is destroyed externally
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
 * Play the next song in the queue.
 * Called automatically when the current song ends.
 */
async function _playNext(guildId) {
  const q = queues.get(guildId);
  if (!q) return;

  if (q.songs.length === 0) {
    // Nothing left — disconnect after a short delay
    setTimeout(() => destroyQueue(guildId), 30_000);
    return;
  }

  q.current = q.songs.shift();

  try {
    const stream = await play.stream(q.current.url);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
      inlineVolume: true,
    });
    resource.volume?.setVolume(q.volume);
    q.player.play(resource);

    q.player.once(AudioPlayerStatus.Idle, () => _playNext(guildId));
  } catch (err) {
    console.error(`[Music] Failed to play "${q.current?.title}":`, err.message);
    q.textChannel?.send(`⚠️ Could not play **${q.current?.title}** — skipping.`).catch(() => {});
    _playNext(guildId);
  }
}

/** Skip the current song. */
function skip(guildId) {
  const q = queues.get(guildId);
  if (!q) return false;
  q.player.stop();
  return true;
}

/** Pause playback. */
function pause(guildId) {
  const q = queues.get(guildId);
  if (!q) return false;
  return q.player.pause();
}

/** Resume playback. */
function resume(guildId) {
  const q = queues.get(guildId);
  if (!q) return false;
  return q.player.unpause();
}

/** Set volume (0–100). */
function setVolume(guildId, percent) {
  const q = queues.get(guildId);
  if (!q) return false;
  q.volume = Math.max(0, Math.min(1, percent / 100));
  // Apply to currently playing resource if possible
  const resource = q.player.state?.resource;
  resource?.volume?.setVolume(q.volume);
  return true;
}

/** Get the current song info. */
function getCurrent(guildId) {
  return queues.get(guildId)?.current ?? null;
}

/** Get the upcoming queue (not including current). */
function getQueueList(guildId) {
  return queues.get(guildId)?.songs ?? [];
}

/** Check if the player is paused. */
function isPaused(guildId) {
  return queues.get(guildId)?.player.state.status === AudioPlayerStatus.Paused;
}

module.exports = {
  play: play_,
  skip,
  pause,
  resume,
  setVolume,
  getCurrent,
  getQueueList,
  isPaused,
  destroyQueue,
};
