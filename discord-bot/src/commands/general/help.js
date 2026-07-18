// ============================================================
// commands/general/help.js — List all available commands
// ============================================================

const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

const sections = [
  {
    name: '📋 General',
    value: '`/ping` `/help` `/userinfo` `/serverinfo` `/avatar` `/say` `/poll` `/embed`',
  },
  {
    name: '🔨 Moderation',
    value: '`/ban` `/kick` `/timeout` `/clear`',
  },
  {
    name: '🔧 Utility',
    value: '`/role` `/welcome` `/goodbye` `/ticket` `/suggest`',
  },
  {
    name: '⭐ Leveling',
    value: '`/level` `/rank` `/leaderboard`',
  },
  {
    name: '🤖 AI',
    value: '`/ai`',
  },
  {
    name: '🎵 Music',
    value: '`/music play` `/music stop` `/music skip` `/music pause` `/music resume` `/music queue` `/music nowplaying` `/music volume`',
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('📖 Show all available commands'),

  async execute(interaction) {
    const embed = createEmbed({
      title: `${interaction.client.user.username} — Command List`,
      description: 'Here\'s everything I can do. All commands use slash (`/`) syntax.',
      fields: sections,
      footer: { text: `${interaction.guild?.name ?? 'Server'} • Use /help for this list` },
      thumbnail: interaction.client.user.displayAvatarURL(),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
