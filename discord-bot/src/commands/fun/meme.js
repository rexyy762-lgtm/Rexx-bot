// ── /meme ─────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a random meme from Reddit 😂'),

  async execute(interaction) {
    await interaction.deferReply();
    try {
      const res  = await fetch('https://meme-api.com/gimme');
      const data = await res.json();

      if (data.nsfw) {
        // Retry once with a SFW subreddit
        const safe = await fetch('https://meme-api.com/gimme/ProgrammerHumor');
        const safeData = await safe.json();
        return interaction.editReply({
          embeds: [createEmbed({
            title: safeData.title,
            description: `📌 r/${safeData.subreddit}  •  ⬆️ ${safeData.ups.toLocaleString()} upvotes`,
            image: safeData.url,
            color: 0xFF6B35,
            footer: { text: `Posted by u/${safeData.author}` },
          })],
        });
      }

      await interaction.editReply({
        embeds: [createEmbed({
          title: data.title,
          description: `📌 r/${data.subreddit}  •  ⬆️ ${data.ups.toLocaleString()} upvotes`,
          image: data.url,
          color: 0xFF6B35,
          footer: { text: `Posted by u/${data.author}` },
        })],
      });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed('Could not fetch a meme right now. Reddit might be napping. 💤')] });
    }
  },
};
