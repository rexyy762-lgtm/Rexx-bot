// ============================================================
// events/interactionCreate.js
// ============================================================

const { errorEmbed } = require('../utils/embeds');
const { createTicket } = require('../utils/ticketCreate');
const { closeTicket } = require('../utils/ticketClose');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction) {

    // Ticket Buttons
    if (interaction.isButton()) {

      if (interaction.customId === "create_ticket") {
        return createTicket(interaction);
      }
if (interaction.customId === "feedback_button") {

console.log("Feedback button clicked");

  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

  const modal = new ModalBuilder()
    .setCustomId('feedback_modal')
    .setTitle('Nova Feedback');

  const input = new TextInputBuilder()
    .setCustomId('feedback_message')
    .setLabel('Your Feedback')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Write your feedback here...')
    .setRequired(true);

  const row = new ActionRowBuilder()
    .addComponents(input);

  modal.addComponents(row);

  await interaction.showModal(modal);
return;

}

      if (interaction.customId === "close_ticket") {
        return closeTicket(interaction);
      }

    }

if (interaction.isModalSubmit()) {

  if (interaction.customId === "feedback_modal") {

    const feedback = interaction.fields.getTextInputValue("feedback_message");

    const { EmbedBuilder } = require('discord.js');

const channel = interaction.client.channels.cache.get('1534214854963892275');

if (channel) {
  const embed = new EmbedBuilder()
    .setColor('Blue')
    .setTitle('📩 New Nova Feedback')
    .addFields(
      {
        name: 'User',
        value: `${interaction.user.tag}`,
      },
      {
        name: 'Feedback',
        value: feedback,
      }
    )
    .setTimestamp();

  channel.send({ embeds: [embed] });
}

    return interaction.reply({
      content: "✅ Feedback sent successfully!",
      ephemeral: true
    });
  }
}
    // Only handle slash commands
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(
      interaction.commandName
    );

    if (!command) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            `No command named \`${interaction.commandName}\` found.`
          )
        ],
        ephemeral: true,
      });
    }

    try {
      await command.execute(interaction);

    } catch (err) {
      console.error(
        `[Command Error] /${interaction.commandName}:`,
        err
      );

      const msg = {
        embeds: [
          errorEmbed(
            'An unexpected error occurred while running this command. Please try again.'
          )
        ],
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
  },
};
