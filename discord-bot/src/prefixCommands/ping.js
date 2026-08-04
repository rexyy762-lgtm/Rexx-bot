// ============================================================
// prefixCommands/ping.js — Prefix Ping Command
// ============================================================

module.exports = {
  name: "ping",

  async execute(message) {
    await message.reply(`🏓 Pong! ${message.client.ws.ping}ms`);
  },
};
