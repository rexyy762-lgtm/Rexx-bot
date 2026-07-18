// ============================================================
// commands/utility/ticket.js — Basic support ticket system
// Creates a private channel for each ticket.
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuildConfig } = require('../../utils/database');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('🎫 Support ticket system')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Open a new support ticket')
        .addStringOption(opt =>
          opt.setName('topic').setDescription('Brief description of your issue').setRequired(false).setMaxLength(200)
        )
    )
    .addSubcommand(sub =>
      sub.setName('close')
        .setDescription('Close this ticket (deletes the channel)')
    )
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Set the category where ticket channels are created')
        .addChannelOption(opt =>
          opt.setName('category')
            .setDescription('Category channel for tickets')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── Create ────────────────────────────────────────────────
    if (sub === 'create') {
      const topic = interaction.options.getString('topic') ?? 'No topic provided';
      const config = getGuildConfig(interaction.guild.id);

      // Prevent duplicate open tickets for the same user
      const existing = interaction.guild.channels.cache.find(
        c => c.name === `ticket-${interaction.user.username.toLowerCase().replace(/\s+/g, '-')}` && c.isTextBased()
      );
      if (existing)
        return interaction.reply({ embeds: [errorEmbed(`You already have an open ticket: ${existing}.`)], ephemeral: true });

      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username.toLowerCase().replace(/\s+/g, '-')}`,
        type: ChannelType.GuildText,
        parent: config.ticketCategory ?? null,
        topic: `Ticket by ${interaction.user.tag} — ${topic}`,
        permissionOverwrites: [
          // Hide from @everyone
          { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          // Give ticket creator access
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          // Give the bot access
          { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
        ],
      });

      const embed = infoEmbed(
        `Hello ${interaction.user}! 👋\n\nA staff member will be with you shortly.\n**Topic:** ${topic}\n\nUse \`/ticket close\` to close this ticket when you're done.`,
        '🎫 Ticket Opened'
      );
      await channel.send({ content: `${interaction.user}`, embeds: [embed] });

      return interaction.reply({ embeds: [successEmbed(`Your ticket has been created: ${channel}`, 'Ticket Created')], ephemeral: true });
    }

    // ── Close ─────────────────────────────────────────────────
    if (sub === 'close') {
      if (!interaction.channel.name.startsWith('ticket-'))
        return interaction.reply({ embeds: [errorEmbed('This command can only be used inside a ticket channel.')], ephemeral: true });

      await interaction.reply({ embeds: [infoEmbed('Closing ticket in 5 seconds…', 'Ticket Closing')] });
      setTimeout(() => interaction.channel.delete('Ticket closed').catch(() => {}), 5000);
      return;
    }

    // ── Setup ─────────────────────────────────────────────────
    if (sub === 'setup') {
      if (!(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)))
        return interaction.reply({ embeds: [errorEmbed('You need **Manage Server** to configure tickets.')], ephemeral: true });

      const category = interaction.options.getChannel('category');
      const { setGuildConfig } = require('../../utils/database');
      setGuildConfig(interaction.guild.id, { ticketCategory: category?.id ?? null });

      return interaction.reply({
        embeds: [successEmbed(
          category ? `New tickets will be placed in the **${category.name}** category.` : 'Ticket category cleared. Tickets will be created without a category.',
          'Ticket Category Set'
        )],
        ephemeral: true,
      });
    }
  },
};
