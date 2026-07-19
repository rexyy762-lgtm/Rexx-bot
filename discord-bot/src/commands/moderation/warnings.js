// ============================================================
// commands/moderation/warnings.js — /warnings
// ============================================================
'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, Colors } = require('discord.js');
const { getWarnings, countWarnings } = require('../../utils/automodDb');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) =>
      o.setName('user').setDescription('User to check').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target  = interaction.options.getUser('user');
    const guildId = interaction.guild.id;
    const warns   = getWarnings(guildId, target.id);
    const total   = countWarnings(guildId, target.id);

    if (!warns.length) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Green)
            .setDescription(`✅ **${target.tag}** has no warnings in this server.`),
        ],
      });
    }

    // Show the 10 most recent
    const recent = warns.slice(0, 10);
    const lines  = recent.map((w, i) => {
      const date = new Date(w.timestamp).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
      return `**#${i + 1}** — ${w.reason}\n*by <@${w.moderator_id}> on ${date}*`;
    });

    const embed = new EmbedBuilder()
      .setColor(Colors.Yellow)
      .setTitle(`⚠️ Warnings — ${target.tag}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: `Total: ${total} warning${total !== 1 ? 's' : ''}${total > 10 ? ` (showing 10 most recent)` : ''}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
