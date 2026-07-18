// ── /joke ─────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

// Fallback jokes in case the API is down
const fallbacks = [
  { setup: 'Why don\'t scientists trust atoms?',            delivery: 'Because they make up everything!' },
  { setup: 'I told my wife she was drawing her eyebrows too high.', delivery: 'She looked surprised.' },
  { setup: 'Why can\'t a bicycle stand on its own?',         delivery: 'Because it\'s two-tired!' },
  { setup: 'What do you call a fake noodle?',               delivery: 'An impasta!' },
  { setup: 'Why did the scarecrow win an award?',           delivery: 'Because he was outstanding in his field!' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Get a random joke 😄')
    .addStringOption(o =>
      o.setName('category')
        .setDescription('Joke category')
        .addChoices(
          { name: 'Any',           value: 'Any' },
          { name: 'Programming',   value: 'Programming' },
          { name: 'Pun',           value: 'Pun' },
          { name: 'Spooky',        value: 'Spooky' },
          { name: 'Christmas',     value: 'Christmas' },
        )
    ),

  async execute(interaction) {
    const category = interaction.options.getString('category') ?? 'Any';
    await interaction.deferReply();

    try {
      const res  = await fetch(
        `https://v2.jokeapi.dev/joke/${category}?blacklistFlags=nsfw,racist,sexist,explicit,religious,political&type=twopart`
      );
      const data = await res.json();

      if (data.error) throw new Error(data.message);

      await interaction.editReply({
        embeds: [createEmbed({
          title: '😄 Here\'s a Joke!',
          fields: [
            { name: '❓ Setup',    value: data.setup,    inline: false },
            { name: '💥 Punchline', value: data.delivery, inline: false },
          ],
          color: 0xF39C12,
          footer: { text: `Category: ${data.category}` },
        })],
      });
    } catch {
      // Use fallback
      const j = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      await interaction.editReply({
        embeds: [createEmbed({
          title: '😄 Here\'s a Joke!',
          fields: [
            { name: '❓ Setup',    value: j.setup,    inline: false },
            { name: '💥 Punchline', value: j.delivery, inline: false },
          ],
          color: 0xF39C12,
          footer: { text: 'Classic Edition' },
        })],
      });
    }
  },
};
