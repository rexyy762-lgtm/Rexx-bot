// ── /poke ─────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getGif } = require('../../utils/giphy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poke')
    .setDescription('Poke someone to get their attention 👉')
    .addUserOption(o => o.setName('user').setDescription('Who to poke').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const author = interaction.user;

    try {
      const gifUrl = await getGif('anime poke');
      await interaction.reply({
        embeds: [createEmbed({
          title: `👉 ${author.username} poked ${target.username}!`,
          description: `*Hey! ${target.username}! Wake up!*`,
          image: gifUrl,
          color: 0x1ABC9C,
          footer: { text: 'Powered by GIPHY' },
        })],
      });
    } catch (err) {
      console.error('[poke]', err.message);
      await interaction.reply({ embeds: [errorEmbed('Could not fetch a GIF right now.')], flags: 64 });
    }
  },
};
