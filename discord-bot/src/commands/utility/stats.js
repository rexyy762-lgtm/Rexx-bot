const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const os = require('os');
const process = require('process');
const pkg = require('../../../package.json');
const discord = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('📊 View Nova bot statistics'),

  async execute(interaction) {
    const client = interaction.client;

    const uptime = Math.floor(process.uptime());
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    const totalUsers = client.guilds.cache.reduce(
      (acc, guild) => acc + guild.memberCount,
      0
    );

    const embed = createEmbed({
      title: '📊 Nova Statistics',
      description: 'Current information about **Nova**.',
      thumbnail: interaction.user.displayAvatarURL({ size: 512 }),

      fields: [
        {
          name: '🤖 General',
          value:
            `**Servers:** ${client.guilds.cache.size}\n` +
            `**Users:** ${totalUsers}\n` +
            `**Commands:** ${client.commands.size}`,
          inline: true,
        },
        {
          name: '⚡ Performance',
          value:
            `**Ping:** ${client.ws.ping}ms\n` +
            `**RAM:** ${memory} MB\n` +
            `**CPU:** ${os.cpus().length} Cores`,
          inline: true,
        },
        {
          name: '🛠️ System',
          value:
            `**Node.js:** ${process.version}\n` +
            `**discord.js:** ${discord.version}\n` +
            `**Version:** ${pkg.version}`,
          inline: false,
        },
        {
          name: '⏱️ Uptime',
          value: `${days}d ${hours}h ${minutes}m ${seconds}s`,
          inline: false,
        },
      ],

      footer: {
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL(),
      },
    });

    await interaction.reply({ embeds: [embed] });
  },
};
