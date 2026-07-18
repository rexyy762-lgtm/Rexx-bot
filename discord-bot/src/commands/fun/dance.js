// ── /dance ────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getGif } = require('../../utils/giphy');

const captions = [
  'Get it! 🕺',
  'Nobody can stop them now! 💃',
  'The dance floor is THEIRS. 👑',
  'No thoughts, only vibes. ✨',
  'Someone call the ambulance… they\'re too fire. 🔥',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dance')
    .setDescription('Show off your moves! 💃🕺'),

  async execute(interaction) {
    try {
      const gifUrl  = await getGif('anime dance');
      const caption = captions[Math.floor(Math.random() * captions.length)];
      await interaction.reply({
        embeds: [createEmbed({
          title: `💃 ${interaction.user.username} hits the dance floor!`,
          description: caption,
          image: gifUrl,
          color: 0x9B59B6,
          footer: { text: 'Powered by GIPHY' },
        })],
      });
    } catch (err) {
      console.error('[dance]', err.message);
      await interaction.reply({ embeds: [errorEmbed('Could not fetch a GIF right now.')], flags: 64 });
    }
  },
};
