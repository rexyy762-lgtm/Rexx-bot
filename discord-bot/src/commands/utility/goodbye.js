// ============================================================
// commands/utility/goodbye.js — Configure the goodbye channel
// ============================================================

const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { setGuildConfig, getGuildConfig } = require('../../utils/database');
const { successEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('goodbye')
    .setDescription('👋 Configure the goodbye message channel')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set the channel for goodbye messages')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Text channel for goodbye messages')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable goodbye messages')
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Check the current goodbye channel')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const channel = interaction.options.getChannel('channel', true);
      setGuildConfig(interaction.guild.id, { goodbyeChannel: channel.id });
      return interaction.reply({ embeds: [successEmbed(`Goodbye messages will now be sent to ${channel}.`, 'Goodbye Channel Set')] });
    }

    if (sub === 'disable') {
      setGuildConfig(interaction.guild.id, { goodbyeChannel: null });
      return interaction.reply({ embeds: [successEmbed('Goodbye messages have been disabled.', 'Goodbye Disabled')] });
    }

    if (sub === 'status') {
      const config = getGuildConfig(interaction.guild.id);
      const channelId = config.goodbyeChannel;
      const status = channelId ? `<#${channelId}>` : 'Not configured';
      return interaction.reply({ embeds: [infoEmbed(`Current goodbye channel: ${status}`, 'Goodbye Status')], ephemeral: true });
    }
  },
};
