// ============================================================
// commands/utility/ticket.js — Nova Ticket Panel
// ============================================================

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Open the support ticket panel"),

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setTitle("🎫 Support Ticket")
      .setDescription(
        "Need help?\nClick the button below to create a ticket."
      )
      .setColor("Blue");

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("create_ticket")
          .setLabel("🎫 Create Ticket")
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
};
