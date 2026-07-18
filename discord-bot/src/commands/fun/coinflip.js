// ── /coinflip ─────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin — heads or tails? 🪙'),

  async execute(interaction) {
    const heads  = Math.random() < 0.5;
    const result = heads ? '🟡 Heads!' : '⚫ Tails!';
    const desc   = heads
      ? 'The coin landed face-up. Heads wins!'
      : 'The coin spun and landed face-down. Tails wins!';

    await interaction.reply({
      embeds: [createEmbed({
        title: '🪙 Coin Flip',
        description: `**${result}**\n${desc}`,
        color: heads ? 0xF1C40F : 0x95A5A6,
        footer: { text: `Flipped by ${interaction.user.username}` },
      })],
    });
  },
};
