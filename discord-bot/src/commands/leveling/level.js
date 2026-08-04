// ============================================================
// commands/leveling/level.js — Show your current level and XP
// ============================================================

const { SlashCommandBuilder } = require('discord.js');
const { getUserXP, xpForLevel } = require('../../utils/database');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('⭐ Show your current level and XP progress'),

  async execute(interaction) {
await interaction.deferReply();
    const { xp, level, messages } = getUserXP(interaction.guild.id, interaction.user.id);

    const currentLevelXP = Math.floor(xpForLevel(level));
    const nextLevelXP    = Math.floor(xpForLevel(level + 1));
    const progress       = xp - currentLevelXP;
    const needed         = nextLevelXP - currentLevelXP;

    // Build a simple ASCII progress bar (20 segments)
    const filled  = Math.floor((progress / needed) * 20);
    const bar     = '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, 20 - filled));
    const percent = Math.min(100, Math.floor((progress / needed) * 100));

    const embed = createEmbed({
      title: `⭐ Level Card — ${interaction.user.username}`,
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: '📊 Level', value: `**${level}**`, inline: true },
        { name: '✨ Total XP', value: `**${xp.toLocaleString()}**`, inline: true },
        { name: '💬 Messages', value: `**${messages.toLocaleString()}**`, inline: true },
        {
          name: `Progress to Level ${level + 1}  (${percent}%)`,
          value: `\`${bar}\`\n${progress.toLocaleString()} / ${needed.toLocaleString()} XP`,
          inline: false,
        },
      ],
      footer: { text: `Server: ${interaction.guild.name}` },
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
