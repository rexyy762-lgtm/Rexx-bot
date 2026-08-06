// ============================================================
// commands/utility/ticket.js — Nova Premium Ticket Panel
// ============================================================

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Open Nova's support panel"),

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("🎫 Nova Support Center")
      .setDescription(
        [
          "> Welcome to **Nova Support**!",
          "",
          "Please select the category that best matches your issue.",
          "",
          "🛠️ General Support",
          "🐞 Bug Report",
          "🤝 Partnership",
          "💡 Suggestion",
          "🚨 User Report",
          "",
          "**Our staff will assist you as soon as possible.**"
        ].join("\n")
      )
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setFooter({
        text: `Powered by Nova • ${interaction.guild.name}`
      })
      .setTimestamp();

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_category")
      .setPlaceholder("📂 Select a ticket category...")
      .addOptions(
        {
          label: "General Support",
          description: "Get help from our staff",
          value: "support",
          emoji: "🛠️",
        },
        {
          label: "Bug Report",
          description: "Report a bug",
          value: "bug",
          emoji: "🐞",
        },
        {
          label: "Partnership",
          description: "Request a partnership",
          value: "partner",
          emoji: "🤝",
        },
        {
          label: "Suggestion",
          description: "Send us your ideas",
          value: "suggestion",
          emoji: "💡",
        },
        {
          label: "User Report",
          description: "Report a member",
          value: "report",
          emoji: "🚨",
        }
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};
