// ── /gay ──────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

const flags = ['🏳️‍🌈', '🌈', '✨', '💅', '🦄', '💖', '🌸'];

function getVerdict(pct) {
  if (pct <= 10)  return 'Basically a rock. Totally straight.';
  if (pct <= 25)  return 'Very much on the straight side.';
  if (pct <= 40)  return 'A little curious. 👀';
  if (pct <= 55)  return 'Somewhere in the middle — valid!';
  if (pct <= 70)  return 'Pretty gay tbh. 💅';
  if (pct <= 85)  return 'Extremely gay. We stan.';
  if (pct <= 99)  return 'SO gay. The gays have been notified.';
  return '100% gay. You ARE the rainbow. 🌈';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gay')
    .setDescription('Check someone\'s gay percentage 🌈 (just for fun!)')
    .addUserOption(o => o.setName('user').setDescription('Whose gayness to measure (default: you)')),

  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const seed   = [...target.id].reduce((a, c) => a + c.charCodeAt(0), 0);
    const pct    = seed % 101;
    const filled = Math.round(pct / 10);
    const flag   = flags[Math.floor(Math.random() * flags.length)];
    const bar    = '🌈'.repeat(filled) + '⬜'.repeat(10 - filled);

    await interaction.reply({
      embeds: [createEmbed({
        title: `${flag} Gay-O-Meter™`,
        description: [
          `**${target.username}** is **${pct}% gay**`,
          '',
          bar,
          '',
          getVerdict(pct),
        ].join('\n'),
        color: 0xFF69B4,
        thumbnail: target.displayAvatarURL({ dynamic: true }),
        footer: { text: '🏳️‍🌈 All results are valid and celebrated.' },
      })],
    });
  },
};
