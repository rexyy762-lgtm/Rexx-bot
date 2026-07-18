// ============================================================
// commands/general/say.js — Make the bot say something
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermissions } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('📢 Make the bot send a message')
    .addStringOption(opt =>
      opt.setName('message').setDescription('The message to send').setRequired(true).setMaxLength(2000)
    )
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel to send to (defaults to current)').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageMessages))) return;

    const message = interaction.options.getString('message', true);
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    await channel.send(message);
    await interaction.reply({ content: `✅ Message sent to ${channel}.`, ephemeral: true });
  },
};
