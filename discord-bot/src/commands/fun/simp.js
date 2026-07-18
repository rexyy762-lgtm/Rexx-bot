// ── /simp ─────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

function getVerdict(pct) {
  if (pct <= 10)  return '😎 Ice cold. Not a simp bone in their body.';
  if (pct <= 25)  return '🙂 Healthy admiration. Totally fine.';
  if (pct <= 40)  return '😬 A little simpy, but nothing alarming.';
  if (pct <= 55)  return '🫣 Mid-tier simp. We have concerns.';
  if (pct <= 70)  return '😩 High simp energy detected. Touch grass.';
  if (pct <= 85)  return '🚨 Code red SIMP ALERT. Someone help them.';
  if (pct <= 99)  return '💸 Chronically simping. No saving them.';
  return '👑 THE ULTIMATE SIMP. A legend. A cautionary tale.';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('simp')
    .setDescription('Calculate someone\'s simp level 💸')
    .addUserOption(o => o.setName('user').setDescription('Who to measure (default: you)')),

  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const seed   = [...(target.id + 'simp')].reduce((a, c) => a + c.charCodeAt(0), 0);
    const pct    = seed % 101;
    const filled = Math.round(pct / 10);
    const bar    = '💸'.repeat(filled) + '⬜'.repeat(10 - filled);

    await interaction.reply({
      embeds: [createEmbed({
        title: '💸 Simp-O-Meter™',
        description: [
          `**${target.username}** is **${pct}% simp**`,
          '',
          bar,
          '',
          getVerdict(pct),
        ].join('\n'),
        color: pct >= 70 ? 0xE74C3C : pct >= 40 ? 0xF39C12 : 0x2ECC71,
        thumbnail: target.displayAvatarURL({ dynamic: true }),
        footer: { text: 'Simp Detector v2.0™ — Highly Accurate™' },
      })],
    });
  },
};
