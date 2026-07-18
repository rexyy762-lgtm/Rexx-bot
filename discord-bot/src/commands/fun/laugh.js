// ── /laugh ────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

const captions = [
  "They can't stop laughing! 😂",
  "Send help. They're dead. 💀",
  "Ha. Ha. Ha. Ha. 🤣",
  "This is NOT that funny… but here we are. 😂",
  "Wheeze. Wheeze. Wheeze. 😹",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('laugh')
    .setDescription('HAHAHAHA 😂'),

  async execute(interaction) {
    try {
      const res  = await fetch('https://nekos.best/api/v2/laugh');
      const data = await res.json();
      const caption = captions[Math.floor(Math.random() * captions.length)];
      await interaction.reply({
        embeds: [createEmbed({
          title: `😂 ${interaction.user.username} is dying of laughter!`,
          description: caption,
          image: data.results[0].url,
          color: 0xFECC02,
          footer: { text: '💀 RIP' },
        })],
      });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Could not fetch a GIF right now.')], flags: 64 });
    }
  },
};
