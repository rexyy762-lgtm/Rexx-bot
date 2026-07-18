// ============================================================
// commands/utility/welcome.js — Configure the welcome channel
// ============================================================

const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { setGuildConfig, getGuildConfig } = require('../../utils/database');
const { successEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('👋 Configure the welcome message channel')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set the channel for welcome messages')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Text channel for welcome messages')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable welcome messages')
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Check the current welcome channel')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const channel = interaction.options.getChannel('channel', true);
      setGuildConfig(interaction.guild.id, { welcomeChannel: channel.id });
      return interaction.reply({ embeds: [successEmbed(`Welcome messages will now be sent to ${channel}.`, 'Welcome Channel Set')] });
    }

    if (sub === 'disable') {
      setGuildConfig(interaction.guild.id, { welcomeChannel: null });
      return interaction.reply({ embeds: [successEmbed('Welcome messages have been disabled.', 'Welcome Disabled')] });
    }

    if (sub === 'status') {
      const config = getGuildConfig(interaction.guild.id);
      const channelId = config.welcomeChannel;
      const status = channelId ? `<#${channelId}>` : 'Not configured';
      return interaction.reply({ embeds: [infoEmbed(`Current welcome channel: ${status}`, 'Welcome Status')], ephemeral: true });
    }
  },
};
