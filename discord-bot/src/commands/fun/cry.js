// ── /cry ──────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getGif } = require('../../utils/giphy');

const captions = [
  'It\'s okay to cry. 💙',
  'Let it all out… 😭',
  'Somebody hold them. 🫂',
  'The tears are real and valid. 💧',
  'Plot twist: they\'re not okay. 😢',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cry')
    .setDescription('Express your sadness 😭'),

  async execute(interaction) {
    try {
      const gifUrl  = await getGif('anime crying');
      const caption = captions[Math.floor(Math.random() * captions.length)];
      await interaction.reply({
        embeds: [createEmbed({
          title: `😭 ${interaction.user.username} is crying!`,
          description: caption,
          image: gifUrl,
          color: 0x74B9FF,
          footer: { text: 'Powered by GIPHY' },
        })],
      });
    } catch (err) {
      console.error('[cry]', err.message);
      await interaction.reply({ embeds: [errorEmbed('Could not fetch a GIF right now.')], flags: 64 });
    }
  },
};
