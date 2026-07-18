// ── /8ball ────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

const responses = [
  // Positive
  { text: '✅ It is certain.',            color: 0x2ECC71 },
  { text: '✅ It is decidedly so.',        color: 0x2ECC71 },
  { text: '✅ Without a doubt.',           color: 0x2ECC71 },
  { text: '✅ Yes, definitely.',           color: 0x2ECC71 },
  { text: '✅ You may rely on it.',        color: 0x2ECC71 },
  { text: '✅ As I see it, yes.',          color: 0x2ECC71 },
  { text: '✅ Most likely.',               color: 0x2ECC71 },
  { text: '✅ Outlook good.',              color: 0x2ECC71 },
  { text: '✅ Yes.',                       color: 0x2ECC71 },
  { text: '✅ Signs point to yes.',        color: 0x2ECC71 },
  // Neutral
  { text: '🟡 Reply hazy, try again.',    color: 0xF1C40F },
  { text: '🟡 Ask again later.',          color: 0xF1C40F },
  { text: '🟡 Better not tell you now.',  color: 0xF1C40F },
  { text: '🟡 Cannot predict now.',       color: 0xF1C40F },
  { text: '🟡 Concentrate and ask again.', color: 0xF1C40F },
  // Negative
  { text: '❌ Don\'t count on it.',       color: 0xE74C3C },
  { text: '❌ My reply is no.',            color: 0xE74C3C },
  { text: '❌ My sources say no.',         color: 0xE74C3C },
  { text: '❌ Outlook not so good.',       color: 0xE74C3C },
  { text: '❌ Very doubtful.',             color: 0xE74C3C },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the Magic 8-Ball a yes/no question 🎱')
    .addStringOption(o =>
      o.setName('question').setDescription('Your yes/no question').setRequired(true).setMaxLength(300)
    ),

  async execute(interaction) {
    const question = interaction.options.getString('question', true);
    const pick     = responses[Math.floor(Math.random() * responses.length)];

    await interaction.reply({
      embeds: [createEmbed({
        title: '🎱 Magic 8-Ball',
        color: pick.color,
        fields: [
          { name: '❓ Question', value: question,   inline: false },
          { name: '🎱 Answer',   value: pick.text,  inline: false },
        ],
        footer: { text: 'The ball has spoken.' },
      })],
    });
  },
};
