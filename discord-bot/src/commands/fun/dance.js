// ── /dance ────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

const captions = [
  "Get it! 🕺",
  "Nobody can stop them now! 💃",
  "The dance floor is THEIRS. 👑",
  "No thoughts, only vibes. ✨",
  "Someone call the ambulance… they're too fire. 🔥",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dance')
    .setDescription('Show off your moves! 💃🕺'),

  async execute(interaction) {
    try {
      const res  = await fetch('https://nekos.best/api/v2/dance');
      const data = await res.json();
      const caption = captions[Math.floor(Math.random() * captions.length)];
      await interaction.reply({
        embeds: [createEmbed({
          title: `💃 ${interaction.user.username} hits the dance floor!`,
          description: caption,
          image: data.results[0].url,
          color: 0x9B59B6,
          footer: { text: '🎵 Party time!' },
        })],
      });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Could not fetch a GIF right now.')], flags: 64 });
    }
  },
};
