// ============================================================
// commands/music/music.js — Music player with subcommands
// Requires the bot to have the CONNECT and SPEAK permissions.
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const play = require('play-dl');
const musicPlayer = require('../../utils/musicPlayer');
const { createEmbed, successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('🎵 Music player controls')
    // play
    .addSubcommand(sub =>
      sub.setName('play')
        .setDescription('Play a song by URL or search query')
        .addStringOption(opt =>
          opt.setName('query').setDescription('YouTube URL or search terms').setRequired(true).setMaxLength(500)
        )
    )
    // stop
    .addSubcommand(sub =>
      sub.setName('stop').setDescription('Stop playback and disconnect from voice')
    )
    // skip
    .addSubcommand(sub =>
      sub.setName('skip').setDescription('Skip the current song')
    )
    // pause
    .addSubcommand(sub =>
      sub.setName('pause').setDescription('Pause playback')
    )
    // resume
    .addSubcommand(sub =>
      sub.setName('resume').setDescription('Resume paused playback')
    )
    // queue
    .addSubcommand(sub =>
      sub.setName('queue').setDescription('Show the upcoming song queue')
    )
    // nowplaying
    .addSubcommand(sub =>
      sub.setName('nowplaying').setDescription('Show the currently playing song')
    )
    // volume
    .addSubcommand(sub =>
      sub.setName('volume')
        .setDescription('Set the playback volume (1–100)')
        .addIntegerOption(opt =>
          opt.setName('percent').setDescription('Volume percentage').setRequired(true).setMinValue(1).setMaxValue(100)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // ── Helper: ensure user is in a voice channel ─────────────
    const voiceChannel = interaction.member?.voice?.channel;

    if (['play', 'stop', 'skip', 'pause', 'resume'].includes(sub) && !voiceChannel) {
      return interaction.reply({ embeds: [errorEmbed('You need to be in a voice channel to use music commands.')], ephemeral: true });
    }

    // ── play ──────────────────────────────────────────────────
    if (sub === 'play') {
      await interaction.deferReply();

      const query = interaction.options.getString('query', true);

      try {
        // Resolve: direct URL or search query
        let songInfo;
        if (play.yt_validate(query) === 'video') {
          // YouTube URL provided directly
          const info = await play.video_info(query);
          songInfo = {
            title: info.video_details.title ?? 'Unknown Title',
            url: query,
            requestedBy: interaction.user.tag,
          };
        } else {
          // Search YouTube for the query
          const results = await play.search(query, { limit: 1 });
          if (!results.length) {
            return interaction.editReply({ embeds: [errorEmbed(`No results found for: **${query}**`)] });
          }
          songInfo = {
            title: results[0].title ?? 'Unknown Title',
            url: results[0].url,
            requestedBy: interaction.user.tag,
          };
        }

        await musicPlayer.play(guildId, voiceChannel, interaction.channel, songInfo);

        const current = musicPlayer.getCurrent(guildId);
        const isQueued = current !== null && current.url !== songInfo.url;

        const embed = createEmbed({
          title: isQueued ? '📥 Added to Queue' : '▶️ Now Playing',
          description: `**[${songInfo.title}](${songInfo.url})**`,
          fields: [
            { name: '📢 Channel', value: voiceChannel.name, inline: true },
            { name: '👤 Requested by', value: songInfo.requestedBy, inline: true },
            { name: '🎵 Queue position', value: isQueued ? `#${musicPlayer.getQueueList(guildId).length}` : 'Up next', inline: true },
          ],
        });

        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error('[Music:play]', err);
        await interaction.editReply({ embeds: [errorEmbed(`Failed to play music: ${err.message}`)] });
      }
    }

    // ── stop ──────────────────────────────────────────────────
    else if (sub === 'stop') {
      musicPlayer.destroyQueue(guildId);
      await interaction.reply({ embeds: [successEmbed('Stopped playback and disconnected from voice.', '⏹️ Stopped')] });
    }

    // ── skip ──────────────────────────────────────────────────
    else if (sub === 'skip') {
      const skipped = musicPlayer.skip(guildId);
      if (!skipped)
        return interaction.reply({ embeds: [errorEmbed('Nothing is currently playing.')], ephemeral: true });
      await interaction.reply({ embeds: [successEmbed('Skipped the current song.', '⏭️ Skipped')] });
    }

    // ── pause ─────────────────────────────────────────────────
    else if (sub === 'pause') {
      const paused = musicPlayer.pause(guildId);
      if (!paused)
        return interaction.reply({ embeds: [errorEmbed('Nothing is playing or already paused.')], ephemeral: true });
      await interaction.reply({ embeds: [successEmbed('Playback paused.', '⏸️ Paused')] });
    }

    // ── resume ────────────────────────────────────────────────
    else if (sub === 'resume') {
      const resumed = musicPlayer.resume(guildId);
      if (!resumed)
        return interaction.reply({ embeds: [errorEmbed('Nothing is paused.')], ephemeral: true });
      await interaction.reply({ embeds: [successEmbed('Playback resumed.', '▶️ Resumed')] });
    }

    // ── queue ─────────────────────────────────────────────────
    else if (sub === 'queue') {
      const current = musicPlayer.getCurrent(guildId);
      const queue = musicPlayer.getQueueList(guildId);

      if (!current) {
        return interaction.reply({ embeds: [infoEmbed('The queue is empty.', '📋 Queue')] });
      }

      const lines = queue.slice(0, 10).map(
        (s, i) => `**${i + 1}.** [${s.title}](${s.url}) — *${s.requestedBy}*`
      );

      const embed = createEmbed({
        title: '📋 Music Queue',
        fields: [
          { name: '▶️ Now Playing', value: `[${current.title}](${current.url})`, inline: false },
          ...(lines.length ? [{ name: `⏭️ Up Next (${queue.length} song${queue.length === 1 ? '' : 's'})`, value: lines.join('\n'), inline: false }] : []),
        ],
      });

      await interaction.reply({ embeds: [embed] });
    }

    // ── nowplaying ────────────────────────────────────────────
    else if (sub === 'nowplaying') {
      const current = musicPlayer.getCurrent(guildId);
      if (!current)
        return interaction.reply({ embeds: [infoEmbed('Nothing is currently playing.', '🎵 Now Playing')] });

      const paused = musicPlayer.isPaused(guildId);
      const embed = createEmbed({
        title: `${paused ? '⏸️ Paused' : '▶️ Now Playing'}`,
        description: `**[${current.title}](${current.url})**`,
        fields: [{ name: '👤 Requested by', value: current.requestedBy, inline: true }],
      });

      await interaction.reply({ embeds: [embed] });
    }

    // ── volume ────────────────────────────────────────────────
    else if (sub === 'volume') {
      const percent = interaction.options.getInteger('percent', true);
      const ok = musicPlayer.setVolume(guildId, percent);
      if (!ok)
        return interaction.reply({ embeds: [errorEmbed('Nothing is currently playing.')], ephemeral: true });

      await interaction.reply({ embeds: [successEmbed(`Volume set to **${percent}%**.`, '🔊 Volume')] });
    }
  },
};
