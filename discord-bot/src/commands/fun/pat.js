// ── /pat ──────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pat')
    .setDescription('Pat someone on the head 🥺')
    .addUserOption(o => o.setName('user').setDescription('Who to pat').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const author = interaction.user;

    try {
      const res  = await fetch('https://nekos.best/api/v2/pat');
      const data = await res.json();
      await interaction.reply({
        embeds: [createEmbed({
          title: target.id === author.id
            ? `🥺 ${author.username} patted themselves.`
            : `🥺 ${author.username} patted ${target.username}!`,
          description: '*Good human! Very good human!*',
          image: data.results[0].url,
          color: 0xFFD700,
          footer: { text: '✨ pat pat' },
        })],
      });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Could not fetch a GIF right now.')], flags: 64 });
    }
  },
};
