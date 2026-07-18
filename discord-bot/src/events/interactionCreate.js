// ============================================================
// events/interactionCreate.js — Routes slash commands to handlers
// ============================================================

const { errorEmbed } = require('../utils/embeds');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction) {
    // Only handle slash commands
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      return interaction.reply({
        embeds: [errorEmbed(`No command named \`${interaction.commandName}\` found.`)],
        ephemeral: true,
      });
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`[Command Error] /${interaction.commandName}:`, err);

      const msg = {
        embeds: [errorEmbed('An unexpected error occurred while running this command. Please try again.')],
        ephemeral: true,
      };

      // Reply or follow up depending on whether we already responded
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
  },
};
