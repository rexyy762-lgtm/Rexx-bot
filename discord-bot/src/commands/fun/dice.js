// ── /dice ─────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

const FACES = { 4: '🎲', 6: '🎲', 8: '🎲', 10: '🎲', 12: '🎲', 20: '🎯', 100: '💯' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll a dice 🎲')
    .addIntegerOption(o =>
      o.setName('sides')
        .setDescription('Number of sides (default: 6)')
        .addChoices(
          { name: 'D4',   value: 4   },
          { name: 'D6',   value: 6   },
          { name: 'D8',   value: 8   },
          { name: 'D10',  value: 10  },
          { name: 'D12',  value: 12  },
          { name: 'D20',  value: 20  },
          { name: 'D100', value: 100 },
        )
    )
    .addIntegerOption(o =>
      o.setName('count').setDescription('How many dice to roll (1–10, default: 1)').setMinValue(1).setMaxValue(10)
    ),

  async execute(interaction) {
    const sides = interaction.options.getInteger('sides') ?? 6;
    const count = interaction.options.getInteger('count') ?? 1;
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);
    const icon  = FACES[sides] ?? '🎲';
    const isCrit = sides === 20 && rolls.includes(20);
    const isFail = sides === 20 && rolls.includes(1);

    let desc = `**Roll${count > 1 ? 's' : ''}:** ${rolls.join(', ')}`;
    if (count > 1) desc += `\n**Total:** ${total}`;
    if (isCrit) desc += '\n\n🌟 **NATURAL 20! CRITICAL HIT!**';
    if (isFail) desc += '\n\n💀 **NATURAL 1! CRITICAL FAIL!**';

    await interaction.reply({
      embeds: [createEmbed({
        title: `${icon} Rolling ${count}D${sides}`,
        description: desc,
        color: isCrit ? 0xF1C40F : isFail ? 0xE74C3C : 0x9B59B6,
        footer: { text: `Rolled by ${interaction.user.username}` },
      })],
    });
  },
};
