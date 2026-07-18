// ============================================================
// commands/utility/suggest.js — Submit a server suggestion
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/database');
const { createEmbed, successEmbed, errorEmbed } = require('../../utils/embeds');
const { colors } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('💡 Submit a suggestion or configure the suggestion channel')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Submit a new suggestion')
        .addStringOption(opt =>
          opt.setName('suggestion').setDescription('Your suggestion').setRequired(true).setMaxLength(1000)
        )
    )
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Set the channel where suggestions are posted')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Text channel for suggestions')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── Setup ─────────────────────────────────────────────────
    if (sub === 'setup') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild))
        return interaction.reply({ embeds: [errorEmbed('You need **Manage Server** to set up suggestions.')], ephemeral: true });

      const channel = interaction.options.getChannel('channel', true);
      setGuildConfig(interaction.guild.id, { suggestionChannel: channel.id });
      return interaction.reply({ embeds: [successEmbed(`Suggestions will now be posted in ${channel}.`, 'Suggestion Channel Set')], ephemeral: true });
    }

    // ── Add ───────────────────────────────────────────────────
    if (sub === 'add') {
      const config = getGuildConfig(interaction.guild.id);
      if (!config.suggestionChannel)
        return interaction.reply({ embeds: [errorEmbed('No suggestion channel is set up yet. Ask an admin to run `/suggest setup`.')], ephemeral: true });

      const channel = interaction.guild.channels.cache.get(config.suggestionChannel);
      if (!channel)
        return interaction.reply({ embeds: [errorEmbed('The configured suggestion channel no longer exists.')], ephemeral: true });

      const text = interaction.options.getString('suggestion', true);

      const embed = createEmbed({
        title: '💡 New Suggestion',
        description: text,
        color: colors.info,
        fields: [{ name: '👤 Suggested by', value: `${interaction.user} (${interaction.user.tag})`, inline: true }],
        footer: { text: `User ID: ${interaction.user.id}` },
      });

      const msg = await channel.send({ embeds: [embed] });
      // Add upvote and downvote reactions
      await msg.react('👍').catch(() => {});
      await msg.react('👎').catch(() => {});

      return interaction.reply({ embeds: [successEmbed(`Your suggestion has been posted in ${channel}!`, 'Suggestion Submitted')], ephemeral: true });
    }
  },
};
