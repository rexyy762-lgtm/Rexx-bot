// ── /wave ─────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wave')
    .setDescription('Wave at someone! 👋')
    .addUserOption(o => o.setName('user').setDescription('Who to wave at (optional)')),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const author = interaction.user;

    try {
      const res  = await fetch('https://nekos.best/api/v2/wave');
      const data = await res.json();
      await interaction.reply({
        embeds: [createEmbed({
          title: target
            ? `👋 ${author.username} waved at ${target.username}!`
            : `👋 ${author.username} waves hello!`,
          description: target ? `*Hey ${target.username}! 👀*` : '*Hellooo!*',
          image: data.results[0].url,
          color: 0x3498DB,
          footer: { text: '👋 Hello there!' },
        })],
      });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Could not fetch a GIF right now.')], flags: 64 });
    }
  },
};
