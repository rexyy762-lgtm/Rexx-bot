// ── /pp ───────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

function getVerdict(size) {
  if (size === 0)  return '🔍 Needs a microscope to find.';
  if (size <= 2)   return '🫣 Oof. Bless your heart.';
  if (size <= 4)   return '😐 Below average, but hey, personality matters!';
  if (size <= 6)   return '😊 Perfectly average. Nothing to write home about.';
  if (size <= 8)   return '😏 Above average. Nice.';
  if (size <= 10)  return '🔥 Impressive! We don\'t believe you, but okay.';
  if (size <= 14)  return '😳 That\'s… a lot. Okay.';
  return '🚀 ASTRONOMICALLY BLESSED. We are calling NASA.';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pp')
    .setDescription('Measure someone\'s pp size 📏 (purely scientific)')
    .addUserOption(o => o.setName('user').setDescription('Whose pp to measure (default: you)')),

  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;

    // Deterministic from user ID so same user always gets same size
    const seed = [...target.id].reduce((a, c) => a + c.charCodeAt(0), 0);
    const size = seed % 21; // 0–20 cm
    const bar  = '8' + '='.repeat(size) + 'D';

    await interaction.reply({
      embeds: [createEmbed({
        title: `📏 ${target.username}'s PP Size`,
        description: [
          `\`${bar}\``,
          `**Size: ${size} cm**`,
          '',
          getVerdict(size),
        ].join('\n'),
        color: 0xE91E8C,
        thumbnail: target.displayAvatarURL({ dynamic: true }),
        footer: { text: '🔬 100% Scientific Research™' },
      })],
    });
  },
};
