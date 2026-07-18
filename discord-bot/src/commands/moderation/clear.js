// ============================================================
// commands/moderation/clear.js — Bulk-delete messages
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermissions, requireBotPermissions } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('🗑️ Bulk-delete messages from this channel')
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('Number of messages to delete (1–100)').setRequired(true).setMinValue(1).setMaxValue(100)
    )
    .addUserOption(opt =>
      opt.setName('user').setDescription('Only delete messages from this user').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageMessages))) return;
    if (!(await requireBotPermissions(interaction, PermissionFlagsBits.ManageMessages))) return;

    const amount = interaction.options.getInteger('amount', true);
    const filterUser = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    try {
      // Fetch messages and optionally filter by user
      let messages = await interaction.channel.messages.fetch({ limit: 100 });

      if (filterUser) {
        messages = messages.filter(m => m.author.id === filterUser.id);
      }

      // Discord only allows bulk-deleting messages < 14 days old
      const recent = messages.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
      const toDelete = [...recent.values()].slice(0, amount);

      if (toDelete.length === 0) {
        return interaction.editReply({ embeds: [errorEmbed('No messages found to delete (messages older than 14 days cannot be bulk-deleted).')] });
      }

      const deleted = await interaction.channel.bulkDelete(toDelete, true);

      await interaction.editReply({
        embeds: [successEmbed(
          `Deleted **${deleted.size}** message(s)${filterUser ? ` from ${filterUser.tag}` : ''}.`,
          'Messages Cleared'
        )],
      });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(`Failed to clear messages: ${err.message}`)] });
    }
  },
};
