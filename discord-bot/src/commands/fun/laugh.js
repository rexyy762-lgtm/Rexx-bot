// ── /laugh ────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getGif } = require('../../utils/giphy');

const captions = [
  'They can\'t stop laughing! 😂',
  'Send help. They\'re dead. 💀',
  'Ha. Ha. Ha. Ha. 🤣',
  'This is NOT that funny… but here we are. 😂',
  'Wheeze. Wheeze. Wheeze. 😹',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('laugh')
    .setDescription('HAHAHAHA 😂'),

  async execute(interaction) {
    try {
      const gifUrl  = await getGif('anime laughing');
      const caption = captions[Math.floor(Math.random() * captions.length)];
      await interaction.reply({
        embeds: [createEmbed({
          title: `😂 ${interaction.user.username} is dying of laughter!`,
          description: caption,
          image: gifUrl,
          color: 0xFECC02,
          footer: { text: 'Powered by GIPHY' },
        })],
      });
    } catch (err) {
      console.error('[laugh]', err.message);
      await interaction.reply({ embeds: [errorEmbed('Could not fetch a GIF right now.')], flags: 64 });
    }
  },
};
