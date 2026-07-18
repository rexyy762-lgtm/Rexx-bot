// ── /roast ────────────────────────────────────────────────────
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

const roasts = [
  "You're the reason they put instructions on shampoo bottles.",
  "I'd give you a nasty look, but you've already got one.",
  "Light travels faster than sound — that's why you seemed bright until you spoke.",
  "You're not stupid; you just have bad luck thinking.",
  "The last time I saw something like you, I flushed it.",
  "You're like a software update — whenever I see you, I think *not now*.",
  "If you were a spice, you'd be flour.",
  "I've seen better heads on a pimple.",
  "You're a gray sprinkle on a rainbow cupcake.",
  "If laughter is the best medicine, your face must be curing the world.",
  "You're not the dumbest person alive, but you better hope they don't die.",
  "You bring everyone so much joy — when you leave the room.",
  "Your wifi password is probably 'password123'.",
  "Even your reflection unfollowed you.",
  "I'd roast you harder, but my mom said I'm not allowed to burn trash.",
  "You're proof that evolution can go in reverse.",
  "Somewhere out there, a tree is tirelessly producing oxygen for you. Apologize to it.",
  "You have your entire life to be an idiot. Why not take today off?",
  "If brains were taxed, you'd get a refund.",
  "You're the type to put a username as 'anonymous' and think no one knows who you are.",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Roast someone (all in good fun!) 🔥')
    .addUserOption(o => o.setName('user').setDescription('Who to roast').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const roast  = roasts[Math.floor(Math.random() * roasts.length)];

    await interaction.reply({
      embeds: [createEmbed({
        title: `🔥 ${interaction.user.username} roasted ${target.username}!`,
        description: `> ${roast}`,
        color: 0xFF4500,
        thumbnail: target.displayAvatarURL({ dynamic: true }),
        footer: { text: '🧯 Someone call the fire department.' },
      })],
    });
  },
};
