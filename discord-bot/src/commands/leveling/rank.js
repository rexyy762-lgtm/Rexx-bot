// ============================================================
// commands/leveling/rank.js — Show a user's server rank position
// ============================================================

const { SlashCommandBuilder } = require('discord.js');
const { getUserXP, getUserRank, xpForLevel } = require('../../utils/database');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('🏅 Show a member\'s rank on the server leaderboard')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Member to check (defaults to you)').setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const { xp, level, messages } = getUserXP(interaction.guild.id, target.id);
    const rank = getUserRank(interaction.guild.id, target.id);
    const nextXP = Math.floor(xpForLevel(level + 1));

    const embed = createEmbed({
      title: `🏅 Rank — ${target.username}`,
      thumbnail: target.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: '🏆 Server Rank', value: `**#${rank}**`, inline: true },
        { name: '📊 Level', value: `**${level}**`, inline: true },
        { name: '✨ XP', value: `**${xp.toLocaleString()}**`, inline: true },
        { name: '💬 Messages', value: `**${messages.toLocaleString()}**`, inline: true },
        { name: '🎯 Next Level At', value: `**${nextXP.toLocaleString()} XP**`, inline: true },
      ],
      footer: { text: `Server: ${interaction.guild.name}` },
    });

    await interaction.reply({ embeds: [embed] });
  },
};
