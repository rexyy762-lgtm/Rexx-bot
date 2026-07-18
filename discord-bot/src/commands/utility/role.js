// ============================================================
// commands/utility/role.js — Add or remove a role from a member
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermissions, requireBotPermissions } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('🎭 Add or remove a role from a member')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a role to a member')
        .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to add').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a role from a member')
        .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageRoles))) return;
    if (!(await requireBotPermissions(interaction, PermissionFlagsBits.ManageRoles))) return;

    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user', true);
    const role = interaction.options.getRole('role', true);
    const member = interaction.guild?.members.cache.get(target.id);

    if (!member)
      return interaction.reply({ embeds: [errorEmbed('That user is not in this server.')], ephemeral: true });

    // Prevent assigning roles higher than the bot's highest role
    if (interaction.guild?.members.me && role.position >= interaction.guild.members.me.roles.highest.position)
      return interaction.reply({ embeds: [errorEmbed('That role is above or equal to my highest role.')], ephemeral: true });

    try {
      if (sub === 'add') {
        await member.roles.add(role, `Role added by ${interaction.user.tag}`);
        await interaction.reply({ embeds: [successEmbed(`Added ${role} to ${member}.`, 'Role Added')] });
      } else {
        await member.roles.remove(role, `Role removed by ${interaction.user.tag}`);
        await interaction.reply({ embeds: [successEmbed(`Removed ${role} from ${member}.`, 'Role Removed')] });
      }
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Failed to update role: ${err.message}`)], ephemeral: true });
    }
  },
};
