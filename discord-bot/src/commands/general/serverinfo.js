// ============================================================
// commands/general/serverinfo.js — Display server information
// ============================================================

const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('🏠 Show information about this server'),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });

    await guild.fetch(); // ensure data is up to date

    const verificationLevels = ['None', 'Low', 'Medium', 'High', 'Very High'];
    const boostTier = guild.premiumTier ? `Tier ${guild.premiumTier}` : 'None';

    const embed = createEmbed({
      title: guild.name,
      thumbnail: guild.iconURL({ dynamic: true, size: 256 }) ?? undefined,
      image: guild.bannerURL({ size: 1024 }) ?? undefined,
      fields: [
        { name: '🆔 Server ID', value: guild.id, inline: true },
        { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false },
        { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
        { name: '💬 Channels', value: `${guild.channels.cache.size}`, inline: true },
        { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: '😀 Emojis', value: `${guild.emojis.cache.size}`, inline: true },
        { name: '🔒 Verification', value: verificationLevels[guild.verificationLevel] ?? 'Unknown', inline: true },
        { name: '🚀 Boost', value: `${guild.premiumSubscriptionCount ?? 0} boost(s) · ${boostTier}`, inline: true },
      ],
      footer: { text: `Requested by ${interaction.user.tag}` },
    });

    await interaction.reply({ embeds: [embed] });
  },
};
