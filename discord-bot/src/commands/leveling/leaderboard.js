// ============================================================
// commands/leveling/leaderboard.js — Top 10 XP leaderboard
// ============================================================

const { SlashCommandBuilder } = require('discord.js');
const { getLeaderboard } = require('../../utils/database');
const { createEmbed } = require('../../utils/embeds');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('🏆 Show the top 10 members by XP'),

  async execute(interaction) {
    await interaction.deferReply();

    const lb = getLeaderboard(interaction.guild.id).slice(0, 10);

    if (lb.length === 0) {
      return interaction.editReply({ content: 'No XP data yet — members earn XP by chatting!' });
    }

    // Build leaderboard lines, resolving usernames where possible
    const lines = await Promise.all(
      lb.map(async (entry, i) => {
        let username = `<@${entry.userId}>`;
        try {
          const user = await interaction.client.users.fetch(entry.userId);
          username = user.tag;
        } catch { /* use mention fallback */ }

        const medal = MEDALS[i] ?? `**${i + 1}.**`;
        return `${medal} ${username} — Level **${entry.level}** · **${entry.xp.toLocaleString()}** XP`;
      })
    );

    const embed = createEmbed({
      title: `🏆 ${interaction.guild.name} — XP Leaderboard`,
      description: lines.join('\n'),
      thumbnail: interaction.guild.iconURL({ dynamic: true }) ?? undefined,
      footer: { text: 'XP is earned by sending messages in the server.' },
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
