// ── /ship ─────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

function getBar(pct) {
  const filled = Math.round(pct / 10);
  return '💗'.repeat(filled) + '🖤'.repeat(10 - filled);
}

function getVerdict(pct) {
  if (pct >= 90) return '💍 Soulmates. Someone propose ALREADY.';
  if (pct >= 75) return '🔥 Very high compatibility. Date already!';
  if (pct >= 60) return '💕 Decent ship. We see potential!';
  if (pct >= 45) return '😬 It\'s… complicated. Could work!';
  if (pct >= 30) return '🤷 Unlikely, but stranger things have happened.';
  if (pct >= 15) return '❄️ Pretty cold. Friends zone imminent.';
  return '💔 Incompatible. Someone go home.';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Check compatibility between two users 💘')
    .addUserOption(o => o.setName('user1').setDescription('First person').setRequired(true))
    .addUserOption(o => o.setName('user2').setDescription('Second person').setRequired(true)),

  async execute(interaction) {
    const u1  = interaction.options.getUser('user1', true);
    const u2  = interaction.options.getUser('user2', true);

    // Deterministic score from combined IDs so same pair always gets same %
    const seed  = [...(u1.id + u2.id)].reduce((a, c) => a + c.charCodeAt(0), 0);
    const score = seed % 101; // 0–100

    const shipName = u1.username.slice(0, Math.ceil(u1.username.length / 2))
                   + u2.username.slice(Math.floor(u2.username.length / 2));

    await interaction.reply({
      embeds: [createEmbed({
        title: `💘 Shipping ${u1.username} & ${u2.username}`,
        description: [
          `**Ship name:** *${shipName}*`,
          ``,
          `${getBar(score)}`,
          `**Compatibility: ${score}%**`,
          ``,
          getVerdict(score),
        ].join('\n'),
        color: score >= 60 ? 0xFF69B4 : score >= 30 ? 0xF39C12 : 0x95A5A6,
        footer: { text: 'Scientifically™ calculated' },
      })],
    });
  },
};
