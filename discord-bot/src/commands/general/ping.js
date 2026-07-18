// ============================================================
// commands/general/ping.js — Show bot latency and API latency
// ============================================================

const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('🏓 Check the bot\'s response time and API latency'),

  async execute(interaction) {
    // Send a placeholder reply first so we can measure round-trip time
    const sent = await interaction.reply({ content: '🏓 Measuring…', fetchReply: true });

    const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsHeartbeat = interaction.client.ws.ping;

    const embed = createEmbed({
      title: '🏓 Pong!',
      fields: [
        { name: '⏱️ Round-trip latency', value: `**${roundTrip}ms**`, inline: true },
        { name: '💓 WebSocket heartbeat', value: `**${wsHeartbeat}ms**`, inline: true },
      ],
    });

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};
