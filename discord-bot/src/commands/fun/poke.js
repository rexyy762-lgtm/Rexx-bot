// ── /poke ─────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poke')
    .setDescription('Poke someone to get their attention 👉')
    .addUserOption(o => o.setName('user').setDescription('Who to poke').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const author = interaction.user;

    try {
      const res  = await fetch('https://nekos.best/api/v2/poke');
      const data = await res.json();
      await interaction.reply({
        embeds: [createEmbed({
          title: `👉 ${author.username} poked ${target.username}!`,
          description: `*Hey! ${target.username}! Wake up!*`,
          image: data.results[0].url,
          color: 0x1ABC9C,
          footer: { text: '👈 poke' },
        })],
      });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Could not fetch a GIF right now.')], flags: 64 });
    }
  },
};
