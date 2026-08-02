// ============================================================
// utils/ticketClose.js
// ============================================================

const ticketConfig = require("./ticketConfig");

async function closeTicket(interaction) {

  const channel = interaction.channel;

  if (!channel.name.startsWith("ticket-")) {
    return interaction.reply({
      content: "❌ This is not a ticket channel.",
      ephemeral: true
    });
  }

  await interaction.reply({
    content: "🔒 Ticket closing...",
    ephemeral: true
  });

  // Ticket log
  if (ticketConfig.logChannelId) {

    const logChannel = interaction.guild.channels.cache.get(
      ticketConfig.logChannelId
    );

    if (logChannel) {
      await logChannel.send({
        content:
          `🎫 Ticket Closed\n` +
          `📁 Channel: ${channel.name}\n` +
          `👤 Closed by: ${interaction.user}`
      });
    }
  }

  setTimeout(() => {
    channel.delete().catch(() => {});
  }, 3000);

}

module.exports = {
  closeTicket
};
