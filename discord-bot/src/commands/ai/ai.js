// ============================================================
// commands/ai/ai.js — Gemini AI Chat Command
// ============================================================

const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Ask Nova AI anything")
    .addStringOption(option =>
      option
        .setName("prompt")
        .setDescription("Your question")
        .setRequired(true)
    ),

  async execute(interaction) {
    const prompt = interaction.options.getString("prompt");

    await interaction.deferReply();

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });

      const answer = response.text || "No response received.";

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("🤖 Nova AI")
        .setDescription(answer.slice(0, 4096))
        .setFooter({
          text: "Powered by Google Gemini",
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
      });

    } catch (error) {
      console.error("Gemini Error:", error);

      await interaction.editReply({
        content: "❌ Failed to generate AI response.",
      });
    }
  },
};
