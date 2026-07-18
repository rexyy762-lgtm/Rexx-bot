// ============================================================
// commands/general/userinfo.js — Display info about a user
// ============================================================

const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('👤 Get information about a user')
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to inspect (defaults to you)').setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const member = interaction.guild?.members.cache.get(target.id);

    const roles = member?.roles.cache
      .filter(r => r.id !== interaction.guild?.id) // exclude @everyone
      .sort((a, b) => b.position - a.position)
      .map(r => `${r}`)
      .slice(0, 10)
      .join(', ') || 'None';

    const embed = createEmbed({
      title: `${target.tag}`,
      thumbnail: target.displayAvatarURL({ dynamic: true, size: 256 }),
      fields: [
        { name: '🆔 User ID', value: target.id, inline: true },
        { name: '🤖 Bot?', value: target.bot ? 'Yes' : 'No', inline: true },
        { name: '📅 Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`, inline: false },
        ...(member ? [
          { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
          { name: `🎭 Roles (${member.roles.cache.size - 1})`, value: roles, inline: false },
          { name: '🌟 Highest Role', value: `${member.roles.highest}`, inline: true },
          { name: '🎨 Nickname', value: member.nickname ?? 'None', inline: true },
        ] : []),
      ],
      footer: { text: `Requested by ${interaction.user.tag}` },
    });

    await interaction.reply({ embeds: [embed] });
  },
};
