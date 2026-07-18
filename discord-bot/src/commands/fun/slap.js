// ── /slap ─────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slap')
    .setDescription('Slap someone!')
    .addUserOption(o => o.setName('user').setDescription('Who to slap').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const author = interaction.user;
    if (target.id === author.id)
      return interaction.reply({ embeds: [errorEmbed("You can't slap yourself… or can you? 🤔")], flags: 64 });

    try {
      const res  = await fetch('https://nekos.best/api/v2/slap');
      const data = await res.json();
      await interaction.reply({
        embeds: [createEmbed({
          title: `👋 ${author.username} slapped ${target.username}!`,
          description: `*${target.username} felt that one.*`,
          image: data.results[0].url,
          color: 0xE74C3C,
          footer: { text: 'Ouch!' },
        })],
      });
    } catch {
      await interaction.reply({ embeds: [errorEmbed('Could not fetch a GIF right now.')], flags: 64 });
    }
  },
};
