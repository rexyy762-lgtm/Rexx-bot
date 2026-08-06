const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('feedback-panel')
    .setDescription('Create Nova feedback panel'),

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('📩 Nova Feedback')
      .setDescription(
        'Have feedback or suggestions for Nova?\n\n' +
        'Click the button below to send your feedback.'
      )
      .setFooter({ text: 'Nova Feedback System' })
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId('feedback_button')
      .setLabel('Send Feedback')
      .setEmoji('📩')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder()
      .addComponents(button);

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
};
