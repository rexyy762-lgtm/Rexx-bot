// ============================================================
// utils/ticketTranscript.js
// ============================================================

async function saveTicketTranscript(channel) {

  const messages = await channel.messages.fetch({
    limit: 100
  });

  let transcript = "";

  messages.reverse().forEach(msg => {
    transcript += `${msg.author.tag}: ${msg.content}\n`;
  });

  return transcript;

}

module.exports = { saveTicketTranscript };

