const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('🔗 Invite Nova and join the support server'),

  async execute(interaction) {
    const embed = createEmbed({
      title: '🤖 Invite Nova',
      description:
        `Thank you for choosing **Nova**!\n\n` +
        `Invite Nova to your server and unlock powerful moderation, utility, leveling, and fun features.\n\n` +
        `Need help, want to report a bug, or stay updated?\n` +
        `Join our official **Support Server**.`,
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true, size: 512 }),

   

      footer: {
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      },
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Invite Nova')
        .setEmoji('🤖')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.com/oauth2/authorize?client_id=1527971692696309830&permissions=8&scope=bot%20applications.commands'),

      new ButtonBuilder()
        .setLabel('Support Server')
        .setEmoji('💬')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/26rdBXuts')
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};
