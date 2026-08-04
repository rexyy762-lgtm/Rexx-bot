// ============================================================
// commands/moderation/serverlock.js — Lock/Unlock entire server
// ============================================================

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
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
    .setName('serverlock')
    .setDescription('🔒 Lock or unlock all text channels in the server')
    .addStringOption(option =>
      option
        .setName('mode')
        .setDescription('Lock or unlock the server')
        .setRequired(true)
        .addChoices(
          { name: 'On', value: 'on' },
          { name: 'Off', value: 'off' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
      await interaction.deferReply();

    if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageChannels))) return;
    if (!(await requireBotPermissions(interaction, PermissionFlagsBits.ManageChannels))) return;

    const mode = interaction.options.getString('mode');
    const everyone = interaction.guild.roles.everyone;

    const channels = interaction.guild.channels.cache.filter(
      channel =>
        channel.type === ChannelType.GuildText ||
        channel.type === ChannelType.GuildAnnouncement
    );

    let updated = 0;

    try {
      for (const [, channel] of channels) {
        await channel.permissionOverwrites.edit(everyone, {
          SendMessages: mode === 'off',
        });

        updated++;
      }

      const title =
        mode === 'on' ? 'Server Locked' : 'Server Unlocked';

      const message =
        mode === 'on'
          ? `🔒 Successfully locked **${updated}** channel(s).`
          : `🔓 Successfully unlocked **${updated}** channel(s).`;

      return interaction.editreply({
        embeds: [successEmbed(message, title)],
      });
    } catch (err) {
      return interaction.editreply({
        embeds: [
          errorEmbed(`Failed to update server channels:\n${err.message}`),
        ],
        ephemeral: true,
      });
    }
  },
};
