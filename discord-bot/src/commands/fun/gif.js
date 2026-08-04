// ============================================================
// commands/fun/gif.js — Giphy GIF Search Command
// ============================================================

const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");

const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gif")
    .setDescription("Search and send a GIF")
    .addStringOption(option =>
      option
        .setName("query")
        .setDescription("What GIF do you want?")
        .setRequired(true)
    ),

  async execute(interaction) {
    const query = interaction.options.getString("query");

    await interaction.deferReply();

    try {
      const response = await axios.get(
        "https://api.giphy.com/v1/gifs/search",
        {
          params: {
            api_key: process.env.GIPHY_API_KEY,
            q: query,
            limit: 10,
            rating: "pg",
          },
        }
      );

      const gifs = response.data.data;

      if (!gifs.length) {
        return interaction.editReply("❌ No GIF found.");
      }

      const gif =
        gifs[Math.floor(Math.random() * gifs.length)];

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🎬 GIF: ${query}`)
        .setImage(gif.images.original.url)
        .setFooter({
          text: "Powered by Giphy",
        });

      await interaction.editReply({
        embeds: [embed],
      });

    } catch (error) {
      console.error("GIF Error:", error);

      await interaction.editReply(
        "❌ Failed to fetch GIF."
      );
    }
  },
};
