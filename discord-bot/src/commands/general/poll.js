// ============================================================
// commands/general/poll.js — Create a reaction poll
// ============================================================

const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('📊 Create a reaction poll')
    .addStringOption(opt =>
      opt.setName('question').setDescription('Poll question').setRequired(true).setMaxLength(256)
    )
    .addStringOption(opt =>
      opt.setName('option1').setDescription('First option').setRequired(true).setMaxLength(100)
    )
    .addStringOption(opt =>
      opt.setName('option2').setDescription('Second option').setRequired(true).setMaxLength(100)
    )
    .addStringOption(opt =>
      opt.setName('option3').setDescription('Third option (optional)').setRequired(false).setMaxLength(100)
    )
    .addStringOption(opt =>
      opt.setName('option4').setDescription('Fourth option (optional)').setRequired(false).setMaxLength(100)
    ),

  async execute(interaction) {
    const question = interaction.options.getString('question', true);
    const rawOptions = [
      interaction.options.getString('option1', true),
      interaction.options.getString('option2', true),
      interaction.options.getString('option3'),
      interaction.options.getString('option4'),
    ].filter(Boolean);

    const optionLines = rawOptions.map((opt, i) => `${NUMBER_EMOJIS[i]} ${opt}`).join('\n');

    const embed = createEmbed({
      title: `📊 ${question}`,
      description: optionLines,
      footer: { text: `Poll by ${interaction.user.tag}` },
    });

    const reply = await interaction.reply({ embeds: [embed], fetchReply: true });

    // Add reaction options
    for (let i = 0; i < rawOptions.length; i++) {
      await reply.react(NUMBER_EMOJIS[i]).catch(() => {});
    }
  },
};
