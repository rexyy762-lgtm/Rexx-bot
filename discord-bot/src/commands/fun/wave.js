// ── /wave ─────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getGif } = require('../../utils/giphy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wave')
    .setDescription('Wave at someone! 👋')
    .addUserOption(o => o.setName('user').setDescription('Who to wave at (optional)')),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const author = interaction.user;

    try {
      const gifUrl = await getGif('anime wave hello');
      await interaction.reply({
        embeds: [createEmbed({
          title: target
            ? `👋 ${author.username} waved at ${target.username}!`
            : `👋 ${author.username} waves hello!`,
          description: target ? `*Hey ${target.username}! 👀*` : '*Hellooo!*',
          image: gifUrl,
          color: 0x3498DB,
          footer: { text: 'Powered by GIPHY' },
        })],
      });
    } catch (err) {
      console.error('[wave]', err.message);
      await interaction.reply({ embeds: [errorEmbed('Could not fetch a GIF right now.')], flags: 64 });
    }
  },
};
