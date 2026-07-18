// ============================================================
// commands/moderation/timeout.js — Timeout (mute) a member
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermissions, requireBotPermissions } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

// Duration presets (label → milliseconds)
const DURATIONS = {
  '60s':  60_000,
  '5m':   5 * 60_000,
  '10m':  10 * 60_000,
  '30m':  30 * 60_000,
  '1h':   60 * 60_000,
  '6h':   6 * 60 * 60_000,
  '12h':  12 * 60 * 60_000,
  '1d':   24 * 60 * 60_000,
  '3d':   3 * 24 * 60 * 60_000,
  '7d':   7 * 24 * 60 * 60_000,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('⏱️ Timeout (mute) a member')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Member to timeout').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('duration')
        .setDescription('Timeout duration')
        .setRequired(true)
        .addChoices(
          { name: '1 minute', value: '60s' },
          { name: '5 minutes', value: '5m' },
          { name: '10 minutes', value: '10m' },
          { name: '30 minutes', value: '30m' },
          { name: '1 hour', value: '1h' },
          { name: '6 hours', value: '6h' },
          { name: '12 hours', value: '12h' },
          { name: '1 day', value: '1d' },
          { name: '3 days', value: '3d' },
          { name: '7 days', value: '7d' },
        )
    )
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the timeout').setRequired(false).setMaxLength(512)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!(await requirePermissions(interaction, PermissionFlagsBits.ModerateMembers))) return;
    if (!(await requireBotPermissions(interaction, PermissionFlagsBits.ModerateMembers))) return;

    const target = interaction.options.getUser('user', true);
    const durationKey = interaction.options.getString('duration', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const ms = DURATIONS[durationKey];

    const member = interaction.guild?.members.cache.get(target.id);
    if (!member)
      return interaction.reply({ embeds: [errorEmbed('That user is not in this server.')], ephemeral: true });

    if (!member.moderatable)
      return interaction.reply({ embeds: [errorEmbed('I cannot timeout this member (insufficient role hierarchy).')], ephemeral: true });

    try {
      await member.timeout(ms, `${interaction.user.tag}: ${reason}`);
      const until = `<t:${Math.floor((Date.now() + ms) / 1000)}:R>`;
      await interaction.reply({
        embeds: [successEmbed(
          `**${target.tag}** has been timed out for **${durationKey}** (expires ${until}).\n**Reason:** ${reason}`,
          'Member Timed Out'
        )],
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to timeout: ${err.message}`)], ephemeral: true });
    }
  },
};
