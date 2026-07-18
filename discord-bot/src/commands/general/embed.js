// ============================================================
// commands/general/embed.js — Build and send a custom embed
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('📝 Send a custom embed message')
    .addStringOption(opt =>
      opt.setName('title').setDescription('Embed title').setRequired(true).setMaxLength(256)
    )
    .addStringOption(opt =>
      opt.setName('description').setDescription('Embed body text').setRequired(true).setMaxLength(2048)
    )
    .addStringOption(opt =>
      opt.setName('color')
        .setDescription('Hex color (e.g. #5865F2). Defaults to blurple.')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('footer').setDescription('Footer text').setRequired(false).setMaxLength(2048)
    )
    .addStringOption(opt =>
      opt.setName('image').setDescription('Image URL to attach to the embed').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);
    const colorHex = interaction.options.getString('color');
    const footer = interaction.options.getString('footer');
    const image = interaction.options.getString('image');

    // Parse hex color if provided
    let color;
    if (colorHex) {
      const parsed = parseInt(colorHex.replace('#', ''), 16);
      if (isNaN(parsed)) {
        return interaction.reply({ embeds: [errorEmbed('Invalid hex color. Example: `#5865F2`')], ephemeral: true });
      }
      color = parsed;
    }

    const embed = createEmbed({
      title,
      description,
      color,
      footer: footer ?? `Sent by ${interaction.user.tag}`,
      image: image ?? undefined,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
