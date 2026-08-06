const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");
const axios = require("axios");
const colorNames = require("../../utils/colors");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("color")
    .setDescription("🎨 Preview and convert colors.")
    .addStringOption(option =>
      option
        .setName("value")
        .setDescription("HEX (#FF0000), RGB (255,0,0), color name or 'random'")
        .setRequired(true)
    ),

  async execute(interaction) {
    let input = interaction.options
      .getString("value")
      .trim()
      .toLowerCase();

    if (input === "random") {
      input =
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0");
    }

    if (colorNames[input]) {
      input = colorNames[input];
    }
  
// Color name fallback using API
if (!colorNames[input]) {
  try {
    const { data } = await axios.get(
      `https://www.thecolorapi.com/id?name=${encodeURIComponent(input)}`
    );

    if (data?.hex?.value) {
      input = data.hex.value;
    }
  } catch (err) {
    // ignore
  }
}


    let hex = null;
    // HEX input
    if (/^#?[0-9A-Fa-f]{6}$/.test(input)) {
      hex = input.startsWith("#") ? input : `#${input}`;
    }

    // RGB input (e.g. 255,0,0)
    else if (/^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(input)) {
      const [r, g, b] = input.split(",").map(v => parseInt(v.trim()));

      if (r > 255 || g > 255 || b > 255) {
        return interaction.reply({
          content: "❌ RGB values must be between **0** and **255**.",
          ephemeral: true,
        });
      }

      hex =
        "#" +
        [r, g, b]
          .map(x => x.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase();
    }

    else {
      return interaction.reply({
        content:
          "❌ Invalid color.\nExamples:\n`#5865F2`\n`255,0,0`\n`red`\n`random`",
        ephemeral: true,
      });
    }

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const brightness = Math.round((r * 299 + g * 587 + b * 114) / 1000);

    const rgb = `${r}, ${g}, ${b}`;

    const decimal = parseInt(hex.replace("#", ""), 16);
    // 3A - Extra Color Calculations

    const invertHex =
      "#" +
      (0xFFFFFF ^ parseInt(hex.slice(1), 16))
        .toString(16)
        .padStart(6, "0")
        .toUpperCase();

    const complementary =
      "#" +
      (
        255 - r
      ).toString(16).padStart(2, "0") +
      (
        255 - g
      ).toString(16).padStart(2, "0") +
      (
        255 - b
      ).toString(16).padStart(2, "0");

    let colorName = "Unknown";

    try {
      const { data } = await axios.get(
        `https://www.thecolorapi.com/id?hex=${hex.replace("#", "")}`
      );

      if (data?.name?.value) {
        colorName = data.name.value;
      }
    } catch (err) {
      // Ignore API errors
    }

    const preview =
      `https://dummyimage.com/600x200/${hex.replace("#", "")}/ffffff.png&text=${encodeURIComponent(hex)}`;

    const embed = new EmbedBuilder()
      .setColor(hex)
      .setTitle("🎨 Color Information")
      .setThumbnail(preview)
      .addFields(
{
  name: "🏷️ Color Name",
  value: colorName,
  inline: true
},
  { name: "🎨 HEX", value: `\`${hex}\``, inline: true },
  { name: "🌈 RGB", value: `\`${rgb}\``, inline: true },
  { name: "🔢 Decimal", value: `\`${decimal}\``, inline: true },
  {
    name: "💡 Brightness",
    value: brightness > 128 ? "Light ☀️" : "Dark 🌙",
    inline: true
  },

{
  name: "🔄 Invert",
  value: `\`${invertHex}\``,
  inline: true
},
{
  name: "🎯 Complement",
  value: `\`${complementary}\``,
  inline: true
}
)
      .setFooter({ text: "Nova Color Utility" })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
