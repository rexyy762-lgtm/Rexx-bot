// ============================================================
// utils/ticketCreate.js
// ============================================================

const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const ticketConfig = require("./ticketConfig");

async function createTicket(interaction) {

  const guild = interaction.guild;
  const user = interaction.user;

  const existing = guild.channels.cache.find(
    ch => ch.name === `ticket-${user.id}`
  );

  if (existing) {
    return interaction.reply({
      content: "❌ You already have an open ticket.",
      ephemeral: true
    });
  }

  const ticketChannel = await guild.channels.create({
    name: `ticket-${user.id}`,
    type: ChannelType.GuildText,
    parent: ticketConfig.categoryId,

    permissionOverwrites: [
      {
        id: guild.id,
        deny: [
          PermissionFlagsBits.ViewChannel
        ]
      },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      },
      {
        id: ticketConfig.staffRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      }
    ]
  });

  const embed = new EmbedBuilder()
    .setTitle("🎫 Ticket Created")
    .setDescription(
      `Hello ${user}\n\nStaff will assist you soon.`
    )
    .setColor("Blue");

  const button = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("🔒 Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

  await ticketChannel.send({
    content: `<@&${ticketConfig.staffRoleId}>`,
    embeds: [embed],
    components: [button]
  });

  await interaction.reply({
    content: `✅ Ticket created: ${ticketChannel}`,
    ephemeral: true
  });

}

module.exports = {
  createTicket
};
