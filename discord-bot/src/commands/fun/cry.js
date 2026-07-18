// ── /cry ──────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

const captions = [
  "It's okay to cry. 💙",
  "Let it all out… 😭",
  "Somebody hold them. 🫂",
  "The tears are real and valid. 💧",
  "Plot twist: they're not okay. 😢",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cry')
    .setDescription('Express your sadness 😭'),

  async execute(interaction) {
    try {
      const res  = await fetch('https://nekos.best/api/v2/cry');
      const data = await res.json();
      const caption = captions[Math.floor(Math.random() * captions.length)];
      await interaction.reply({
        embeds: [createEmbed({
          title: `😭 ${interaction.user.username} is crying!`,
          description: caption,
          image: data.results[0].url,
          color: 0x74B9FF,
          footer: { text: '💧 There there...' },
        })],
      });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Could not fetch a GIF right now.')], flags: 64 });
    }
  },
};
