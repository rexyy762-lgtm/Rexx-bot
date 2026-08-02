// ============================================================
// commands/moderation/antinuke.js
// Enable or disable AntiNuke protection
// ============================================================

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require('discord.js');

const {
  requirePermissions,
  requireBotPermissions,
} = require('../../utils/permissions');

const {
  successEmbed,
  errorEmbed,
} = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('🛡️ Enable or disable AntiNuke')
    .addStringOption(option =>
      option
        .setName('mode')
        .setDescription('Enable or Disable AntiNuke')
        .setRequired(true)
        .addChoices(
          { name: 'Enable', value: 'enable' },
          { name: 'Disable', value: 'disable' },
          { name: 'Status', value: 'status' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!(await requirePermissions(interaction, PermissionFlagsBits.Administrator))) return;
    if (!(await requireBotPermissions(interaction, PermissionFlagsBits.Administrator))) return;

    const mode = interaction.options.getString('mode');
    if (mode === 'enable') {
      return interaction.reply({
        embeds: [
          successEmbed(
            '🛡️ AntiNuke has been **enabled**.\n\n⚠️ Protection events are not installed yet, so this is currently a placeholder.',
            'AntiNuke Enabled'
          ),
        ],
      });
    }

    if (mode === 'disable') {
      return interaction.reply({
        embeds: [
          successEmbed(
            '🛡️ AntiNuke has been **disabled**.',
            'AntiNuke Disabled'
          ),
        ],
      });
    }

    return interaction.reply({
      embeds: [
        successEmbed(
          '🛡️ **AntiNuke Status**\nCurrent Status: **Not Configured**',
          'AntiNuke Status'
        ),
      ],
      ephemeral: true,
    });
  },
};

