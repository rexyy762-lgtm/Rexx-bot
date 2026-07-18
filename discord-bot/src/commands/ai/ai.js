// ============================================================
// commands/ai/ai.js — Chat with an AI assistant via OpenAI
// Requires OPENAI_API_KEY to be set in Replit Secrets.
// ============================================================

const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { openaiApiKey, colors } = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('🤖 Ask the AI assistant a question')
    .addStringOption(opt =>
      opt.setName('prompt').setDescription('Your question or prompt').setRequired(true).setMaxLength(1000)
    )
    .addBooleanOption(opt =>
      opt.setName('ephemeral').setDescription('Only show the response to you? (default: false)').setRequired(false)
    ),

  async execute(interaction) {
    if (!openaiApiKey) {
      return interaction.reply({
        embeds: [errorEmbed(
          'The **OPENAI_API_KEY** secret is not configured.\n' +
          'Ask the server admin to add it to the bot\'s Replit Secrets.',
          'AI Not Configured'
        )],
        ephemeral: true,
      });
    }

    const prompt = interaction.options.getString('prompt', true);
    const ephemeral = interaction.options.getBoolean('ephemeral') ?? false;

    await interaction.deferReply({ ephemeral });

    try {
      // Use native fetch (Node 18+) to call the OpenAI Chat Completions API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful, friendly Discord bot assistant. ' +
                'Keep answers concise (under 1900 characters). ' +
                'Use markdown formatting when helpful.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 800,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message ?? `HTTP ${response.status}`);
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content?.trim() ?? 'No response received.';

      // Truncate if somehow over Discord's limit
      const truncated = answer.length > 1900 ? answer.slice(0, 1900) + '…' : answer;

      const embed = createEmbed({
        title: '🤖 AI Response',
        description: truncated,
        color: colors.primary,
        fields: [{ name: '❓ Your Question', value: prompt.length > 200 ? prompt.slice(0, 200) + '…' : prompt, inline: false }],
        footer: { text: `Asked by ${interaction.user.tag} • Powered by OpenAI` },
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[AI Command]', err);
      await interaction.editReply({
        embeds: [errorEmbed(`Failed to get a response from the AI: ${err.message}`)],
      });
    }
  },
};
