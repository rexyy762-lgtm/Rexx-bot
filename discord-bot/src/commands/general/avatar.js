// ============================================================
// commands/general/avatar.js — Display a user's avatar
// ============================================================

const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('🖼️ Display a user\'s avatar')
    .addUserOption(opt =>
      opt.setName('user').setDescription('User whose avatar to show (defaults to you)').setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const avatarUrl = target.displayAvatarURL({ dynamic: true, size: 1024 });

    const embed = createEmbed({
      title: `${target.username}'s Avatar`,
      image: avatarUrl,
      fields: [
        { name: '🔗 Links', value: `[PNG](${target.displayAvatarURL({ format: 'png', size: 1024 })}) • [JPG](${target.displayAvatarURL({ format: 'jpg', size: 1024 })}) • [WEBP](${target.displayAvatarURL({ format: 'webp', size: 1024 })})`, inline: false },
      ],
      footer: { text: `User ID: ${target.id}` },
    });

    await interaction.reply({ embeds: [embed] });
  },
};
