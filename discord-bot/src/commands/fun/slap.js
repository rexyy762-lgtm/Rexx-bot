// ── /slap ─────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getGif } = require('../../utils/giphy');

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
      const gifUrl = await getGif('anime slap');
      await interaction.reply({
        embeds: [createEmbed({
          title: `👋 ${author.username} slapped ${target.username}!`,
          description: `*${target.username} felt that one.*`,
          image: gifUrl,
          color: 0xE74C3C,
          footer: { text: 'Powered by GIPHY' },
        })],
      });
    } catch (err) {
      console.error('[slap]', err.message);
      await interaction.reply({ embeds: [errorEmbed('Could not fetch a GIF right now.')], flags: 64 });
    }
  },
};
