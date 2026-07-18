// ============================================================
// commands/moderation/kick.js — Kick a member from the server
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermissions, requireBotPermissions } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('👢 Kick a member from the server')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Member to kick').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the kick').setRequired(false).setMaxLength(512)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    if (!(await requirePermissions(interaction, PermissionFlagsBits.KickMembers))) return;
    if (!(await requireBotPermissions(interaction, PermissionFlagsBits.KickMembers))) return;

    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (target.id === interaction.user.id)
      return interaction.reply({ embeds: [errorEmbed('You cannot kick yourself.')], ephemeral: true });

    const member = interaction.guild?.members.cache.get(target.id);
    if (!member)
      return interaction.reply({ embeds: [errorEmbed('That user is not in this server.')], ephemeral: true });

    if (!member.kickable)
      return interaction.reply({ embeds: [errorEmbed('I cannot kick this member (insufficient role hierarchy).')], ephemeral: true });

    try {
      await target.send(`You have been **kicked** from **${interaction.guild?.name}**.\n**Reason:** ${reason}`).catch(() => {});
      await member.kick(`${interaction.user.tag}: ${reason}`);
      await interaction.reply({
        embeds: [successEmbed(`**${target.tag}** has been kicked.\n**Reason:** ${reason}`, 'Member Kicked')],
      });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to kick: ${err.message}`)], ephemeral: true });
    }
  },
};
