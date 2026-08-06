const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emojis')
    .setDescription('List all server emojis with their IDs'),
  async execute(interaction) {
    const emojis = interaction.guild.emojis.cache;

    if (!emojis.size) {
      return interaction.reply({
        content: '❌ This server has no custom emojis.',
        ephemeral: true,
      });
    }

    const list = emojis.map(
      emoji => `${emoji} • \`${emoji.name}\`\nID: \`${emoji.id}\``
    );

    const embed = new EmbedBuilder()
      .setColor('#00E5FF')
      .setTitle('🌌 Nova Server Emojis')
      .setDescription(list.join('\n\n'))
      .setFooter({ text: `Total Emojis: ${emojis.size}` });

    await interaction.reply({
      embeds: [embed],
    });
  },
};
