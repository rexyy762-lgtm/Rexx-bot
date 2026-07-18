// ── /hug ──────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hug')
    .setDescription('Give someone a warm hug 🤗')
    .addUserOption(o => o.setName('user').setDescription('Who to hug').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const author = interaction.user;
    const selfHug = target.id === author.id;

    try {
      const res  = await fetch('https://nekos.best/api/v2/hug');
      const data = await res.json();
      await interaction.reply({
        embeds: [createEmbed({
          title: selfHug
            ? `🤗 ${author.username} hugged themselves… aww.`
            : `🤗 ${author.username} hugged ${target.username}!`,
          description: selfHug ? '*Giving yourself some love. Respect.*' : '*Wholesome!*',
          image: data.results[0].url,
          color: 0xFF69B4,
          footer: { text: '❤️ Spread love!' },
        })],
      });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Could not fetch a GIF right now.')], flags: 64 });
    }
  },
};
