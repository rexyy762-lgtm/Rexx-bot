const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription('Shows bot information'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Nova Bot')
            .setDescription('A multipurpose Discord bot made by Developer Rex')
            .addFields(
                { name: '👑 Owner', value: 'Developer Rex', inline: true },
                { name: '⚙️ Library', value: 'discord.js', inline: true },
                { name: '🚀 Status', value: 'Online 24/7', inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
