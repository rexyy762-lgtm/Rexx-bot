// ============================================================
// commands/moderation/clearwarnings.js — /clearwarnings
// ============================================================
'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, Colors } = require('discord.js');
const { clearWarnings } = require('../../utils/automodDb');
const { logModAction }  = require('../../automod/modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarnings')
    .setDescription("Clear all warnings for a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) =>
      o.setName('user').setDescription('User whose warnings to clear').setRequired(true))
    .addStringOption((o) =>
      o.setName('reason').setDescription('Reason for clearing warnings')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target  = interaction.options.getUser('user');
    const reason  = interaction.options.getString('reason') ?? 'No reason provided';
    const guildId = interaction.guild.id;
    const removed = clearWarnings(guildId, target.id);

    if (removed === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Blurple)
            .setDescription(`ℹ️ **${target.tag}** has no warnings to clear.`),
        ],
      });
    }

    // Log the action
    await logModAction({
      guild:   interaction.guild,
      target,
      action:  'delete',
      reason:  `Warnings cleared by ${interaction.user.tag}: ${reason}`,
      feature: 'Manual Clear',
      extra:   `${removed} warning${removed !== 1 ? 's' : ''} removed`,
    });

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Green)
          .setTitle('🗑️ Warnings Cleared')
          .setDescription(
            `Cleared **${removed}** warning${removed !== 1 ? 's' : ''} from **${target.tag}**.\n**Reason:** ${reason}`
          )
          .setTimestamp(),
      ],
    });
  },
};
