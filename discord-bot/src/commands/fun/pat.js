// ── /pat ──────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getGif } = require('../../utils/giphy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pat')
    .setDescription('Pat someone on the head 🥺')
    .addUserOption(o => o.setName('user').setDescription('Who to pat').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const author = interaction.user;

    try {
      const gifUrl = await getGif('anime head pat');
      await interaction.reply({
        embeds: [createEmbed({
          title: target.id === author.id
            ? `🥺 ${author.username} patted themselves.`
            : `🥺 ${author.username} patted ${target.username}!`,
          description: '*Good human! Very good human!*',
          image: gifUrl,
          color: 0xFFD700,
          footer: { text: 'Powered by GIPHY' },
        })],
      });
    } catch (err) {
      console.error('[pat]', err.message);
      await interaction.reply({ embeds: [errorEmbed('Could not fetch a GIF right now.')], flags: 64 });
    }
  },
};
