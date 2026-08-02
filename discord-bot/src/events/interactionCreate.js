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

      if (interaction.customId === "close_ticket") {
        return closeTicket(interaction);
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
