// ============================================================
// commands/moderation/lockdown.js — Lock or unlock a channel
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
    .setName('lockdown')
    .setDescription('🔒 Lock or unlock the current channel')
    .addStringOption(opt =>
      opt
        .setName('mode')
        .setDescription('Choose whether to lock or unlock the channel')
        .setRequired(true)
        .addChoices(
          { name: 'On', value: 'on' },
          { name: 'Off', value: 'off' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageChannels))) return;
    if (!(await requireBotPermissions(interaction, PermissionFlagsBits.ManageChannels))) return;

    const mode = interaction.options.getString('mode');
    const channel = interaction.channel;
    const everyone = interaction.guild.roles.everyone;
    try {
      if (mode === 'on') {
        await channel.permissionOverwrites.edit(everyone, {
          SendMessages: false,
        });

        return interaction.reply({
          embeds: [
            successEmbed(
              `🔒 ${channel} has been locked.\nMembers can no longer send messages.`,
              'Channel Locked'
            ),
          ],
        });
      }

      await channel.permissionOverwrites.edit(everyone, {
        SendMessages: true,
      });

      return interaction.reply({
        embeds: [
          successEmbed(
            `🔓 ${channel} has been unlocked.\nMembers can send messages again.`,
            'Channel Unlocked'
          ),
        ],
      });
    } catch (err) {
      return interaction.reply({
        embeds: [
          errorEmbed(`Failed to update channel permissions:\n${err.message}`),
        ],
        ephemeral: true,
      });
    }
  },
};

