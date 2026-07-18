// ============================================================
// commands/moderation/ban.js — Ban a member from the server
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermissions, requireBotPermissions } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('🔨 Ban a member from the server')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Member to ban').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the ban').setRequired(false).setMaxLength(512)
    )
    .addIntegerOption(opt =>
      opt.setName('days').setDescription('Delete messages from last N days (0–7)').setMinValue(0).setMaxValue(7).setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    if (!(await requirePermissions(interaction, PermissionFlagsBits.BanMembers))) return;
    if (!(await requireBotPermissions(interaction, PermissionFlagsBits.BanMembers))) return;

    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const days = interaction.options.getInteger('days') ?? 0;

    // Prevent banning yourself or the bot
    if (target.id === interaction.user.id)
      return interaction.reply({ embeds: [errorEmbed('You cannot ban yourself.')], ephemeral: true });
    if (target.id === interaction.client.user.id)
      return interaction.reply({ embeds: [errorEmbed('I cannot ban myself.')], ephemeral: true });

    const member = interaction.guild?.members.cache.get(target.id);

    // Check role hierarchy
    if (member && interaction.guild?.members.me) {
      if (member.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({ embeds: [errorEmbed('My highest role is not above that member\'s highest role.')], ephemeral: true });
      }
    }

    try {
      // DM the user before banning so they receive the notification
      await target.send(`You have been **banned** from **${interaction.guild?.name}**.\n**Reason:** ${reason}`).catch(() => {});

      await interaction.guild?.bans.create(target.id, {
        deleteMessageSeconds: days * 86400,
        reason: `${interaction.user.tag}: ${reason}`,
      });

      await interaction.reply({
        embeds: [successEmbed(`**${target.tag}** has been banned.\n**Reason:** ${reason}`, 'Member Banned')],
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to ban: ${err.message}`)], ephemeral: true });
    }
  },
};
