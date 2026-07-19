// ============================================================
// commands/moderation/automod.js — /automod command
// ============================================================
'use strict';

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  Colors,
  ChannelType,
} = require('discord.js');
const db = require('../../utils/automodDb');
const { invalidateBlacklistCache } = require('../../automod/antibadwords');
const { invalidateLinkCache }      = require('../../automod/antilinks');

// ── Helper ───────────────────────────────────────────────────
const bool  = (v) => (v ? '✅ Enabled' : '❌ Disabled');
const boolV = (v) => (v ? 1 : 0);

function actionChoices() {
  return [
    { name: 'Warn',    value: 'warn'    },
    { name: 'Timeout', value: 'timeout' },
    { name: 'Kick',    value: 'kick'    },
    { name: 'Ban',     value: 'ban'     },
  ];
}

// ── Command Definition ───────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Manage the Auto Moderation system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    // ── enable / disable / status ────────────────────────────
    .addSubcommand((s) =>
      s.setName('enable').setDescription('Enable AutoMod for this server'))
    .addSubcommand((s) =>
      s.setName('disable').setDescription('Disable AutoMod for this server'))
    .addSubcommand((s) =>
      s.setName('status').setDescription('Show current AutoMod configuration'))

    // ── config group ─────────────────────────────────────────
    .addSubcommandGroup((g) =>
      g.setName('config').setDescription('Configure AutoMod settings')

        .addSubcommand((s) =>
          s.setName('antispam').setDescription('Configure anti-spam')
            .addIntegerOption((o) => o.setName('threshold').setDescription('Max messages per interval (default 5)').setMinValue(2).setMaxValue(20))
            .addIntegerOption((o) => o.setName('interval').setDescription('Interval in seconds (default 5)').setMinValue(1).setMaxValue(60))
            .addStringOption((o) => o.setName('action').setDescription('Action to take').addChoices(...actionChoices()))
            .addIntegerOption((o) => o.setName('timeout_mins').setDescription('Timeout length in minutes (default 5)').setMinValue(1).setMaxValue(1440)))

        .addSubcommand((s) =>
          s.setName('badwords').setDescription('Configure bad-words filter')
            .addStringOption((o) => o.setName('action').setDescription('Action to take').addChoices(...actionChoices()))
            .addBooleanOption((o) => o.setName('enabled').setDescription('Enable or disable this module')))

        .addSubcommand((s) =>
          s.setName('links').setDescription('Configure link filter')
            .addBooleanOption((o) => o.setName('block_invites').setDescription('Block Discord invite links'))
            .addBooleanOption((o) => o.setName('block_external').setDescription('Block all external links'))
            .addStringOption((o) => o.setName('action').setDescription('Action to take').addChoices(...actionChoices()))
            .addBooleanOption((o) => o.setName('enabled').setDescription('Enable or disable this module')))

        .addSubcommand((s) =>
          s.setName('mentions').setDescription('Configure mention-spam filter')
            .addIntegerOption((o) => o.setName('threshold').setDescription('Max mentions per message (default 5)').setMinValue(1).setMaxValue(30))
            .addStringOption((o) => o.setName('action').setDescription('Action to take').addChoices(...actionChoices()))
            .addBooleanOption((o) => o.setName('enabled').setDescription('Enable or disable this module')))

        .addSubcommand((s) =>
          s.setName('caps').setDescription('Configure caps filter')
            .addIntegerOption((o) => o.setName('percentage').setDescription('Caps % to trigger (default 70)').setMinValue(10).setMaxValue(100))
            .addIntegerOption((o) => o.setName('min_length').setDescription('Min message length to check (default 10)').setMinValue(3).setMaxValue(200))
            .addStringOption((o) => o.setName('action').setDescription('Action to take').addChoices(...actionChoices()))
            .addBooleanOption((o) => o.setName('enabled').setDescription('Enable or disable this module')))

        .addSubcommand((s) =>
          s.setName('emoji').setDescription('Configure emoji-spam filter')
            .addIntegerOption((o) => o.setName('threshold').setDescription('Max emoji per message (default 10)').setMinValue(2).setMaxValue(50))
            .addStringOption((o) => o.setName('action').setDescription('Action to take').addChoices(...actionChoices()))
            .addBooleanOption((o) => o.setName('enabled').setDescription('Enable or disable this module')))

        .addSubcommand((s) =>
          s.setName('raid').setDescription('Configure anti-raid')
            .addIntegerOption((o) => o.setName('threshold').setDescription('Joins to trigger raid alert (default 10)').setMinValue(3).setMaxValue(50))
            .addIntegerOption((o) => o.setName('interval').setDescription('Detection window in seconds (default 10)').setMinValue(3).setMaxValue(60))
            .addStringOption((o) =>
              o.setName('action').setDescription('Action against raiders').addChoices(
                { name: 'Alert Only', value: 'alert' },
                { name: 'Kick Raiders', value: 'kick' },
                { name: 'Ban Raiders',  value: 'ban'  },
              ))
            .addBooleanOption((o) => o.setName('enabled').setDescription('Enable or disable this module')))

        .addSubcommand((s) =>
          s.setName('scam').setDescription('Configure anti-scam filter')
            .addBooleanOption((o) => o.setName('enabled').setDescription('Enable or disable this module').setRequired(true)))

        .addSubcommand((s) =>
          s.setName('warns').setDescription('Configure warning escalation thresholds')
            .addIntegerOption((o) => o.setName('timeout_at').setDescription('Timeout user after X warnings (default 3)').setMinValue(1).setMaxValue(20))
            .addIntegerOption((o) => o.setName('kick_at').setDescription('Kick user after X warnings (default 5)').setMinValue(1).setMaxValue(20))
            .addIntegerOption((o) => o.setName('ban_at').setDescription('Ban user after X warnings (default 7)').setMinValue(1).setMaxValue(20))
            .addIntegerOption((o) => o.setName('timeout_duration').setDescription('Timeout duration in minutes (default 10)').setMinValue(1).setMaxValue(10080)))

        .addSubcommand((s) =>
          s.setName('logs').setDescription('Set the mod-log channel')
            .addChannelOption((o) =>
              o.setName('channel').setDescription('Channel to send mod logs to').setRequired(true)
                .addChannelTypes(ChannelType.GuildText))))

    // ── whitelist group ───────────────────────────────────────
    .addSubcommandGroup((g) =>
      g.setName('whitelist').setDescription('Manage the AutoMod whitelist')
        .addSubcommand((s) =>
          s.setName('add').setDescription('Add an entry to the whitelist')
            .addStringOption((o) =>
              o.setName('type').setDescription('Whitelist type').setRequired(true)
                .addChoices(
                  { name: 'Link / Domain', value: 'link'    },
                  { name: 'Channel',       value: 'channel' },
                  { name: 'Role',          value: 'role'    },
                  { name: 'User',          value: 'user'    },
                ))
            .addStringOption((o) =>
              o.setName('value').setDescription('Domain, channel ID, role ID, or user ID').setRequired(true)))
        .addSubcommand((s) =>
          s.setName('remove').setDescription('Remove an entry from the whitelist')
            .addStringOption((o) =>
              o.setName('type').setDescription('Whitelist type').setRequired(true)
                .addChoices(
                  { name: 'Link / Domain', value: 'link'    },
                  { name: 'Channel',       value: 'channel' },
                  { name: 'Role',          value: 'role'    },
                  { name: 'User',          value: 'user'    },
                ))
            .addStringOption((o) =>
              o.setName('value').setDescription('Value to remove').setRequired(true)))
        .addSubcommand((s) =>
          s.setName('list').setDescription('Show current whitelist')))

    // ── blacklist group ───────────────────────────────────────
    .addSubcommandGroup((g) =>
      g.setName('blacklist').setDescription('Manage the bad-words blacklist')
        .addSubcommand((s) =>
          s.setName('add').setDescription('Add a word to the blacklist')
            .addStringOption((o) =>
              o.setName('word').setDescription('Word to blacklist').setRequired(true).setMaxLength(100)))
        .addSubcommand((s) =>
          s.setName('remove').setDescription('Remove a word from the blacklist')
            .addStringOption((o) =>
              o.setName('word').setDescription('Word to remove').setRequired(true).setMaxLength(100)))
        .addSubcommand((s) =>
          s.setName('list').setDescription('Show current blacklist'))),

  // ── Execute ─────────────────────────────────────────────────
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guild.id;
    const group   = interaction.options.getSubcommandGroup(false);
    const sub     = interaction.options.getSubcommand();

    // ── Top-level ─────────────────────────────────────────────
    if (!group) {
      if (sub === 'enable') {
        db.setConfigField(guildId, 'enabled', 1);
        return interaction.editReply({ embeds: [ok('AutoMod enabled for this server.')] });
      }

      if (sub === 'disable') {
        db.setConfigField(guildId, 'enabled', 0);
        return interaction.editReply({ embeds: [ok('AutoMod disabled for this server.')] });
      }

      if (sub === 'status') {
        const c = db.getConfig(guildId);
        const wl = db.getWhitelist(guildId);
        const bl = db.getBlacklist(guildId);

        const embed = new EmbedBuilder()
          .setTitle('🛡️ AutoMod Configuration')
          .setColor(c.enabled ? Colors.Green : Colors.Red)
          .addFields(
            { name: '🔁 AutoMod',       value: bool(c.enabled),            inline: true },
            { name: '📨 Mod Log',        value: c.modlog_channel ? `<#${c.modlog_channel}>` : 'Not set', inline: true },
            { name: '\u200B',            value: '\u200B',                   inline: true },
            { name: '📩 Anti Spam',      value: `${bool(c.antispam_enabled)}\nThreshold: ${c.antispam_threshold} msgs / ${c.antispam_interval / 1000}s\nAction: **${c.antispam_action}**`,      inline: true },
            { name: '🤬 Bad Words',      value: `${bool(c.badwords_enabled)}\nAction: **${c.badwords_action}**\nWords: ${bl.length}`, inline: true },
            { name: '🔗 Anti Links',     value: `${bool(c.antilinks_enabled)}\nInvites: ${bool(c.antilinks_invites)}\nExternal: ${bool(c.antilinks_external)}\nAction: **${c.antilinks_action}**`, inline: true },
            { name: '📢 Mentions',       value: `${bool(c.antimentions_enabled)}\nMax: ${c.antimentions_threshold}\nAction: **${c.antimentions_action}**`, inline: true },
            { name: '🔠 Anti Caps',      value: `${bool(c.anticaps_enabled)}\nAt: ${c.anticaps_threshold}% / ${c.anticaps_min_length} chars\nAction: **${c.anticaps_action}**`, inline: true },
            { name: '😂 Emoji Spam',     value: `${bool(c.antiemoji_enabled)}\nMax: ${c.antiemoji_threshold}\nAction: **${c.antiemoji_action}**`, inline: true },
            { name: '🚨 Anti Raid',      value: `${bool(c.antiraid_enabled)}\n${c.antiraid_threshold} joins / ${c.antiraid_interval / 1000}s\nAction: **${c.antiraid_action}**`, inline: true },
            { name: '🎣 Anti Scam',      value: bool(c.antiscam_enabled),   inline: true },
            { name: '\u200B',            value: '\u200B',                   inline: true },
            { name: '⚠️ Warn Escalation', value: `Timeout at **${c.warn_timeout_at}** warns (${Math.round(c.warn_timeout_duration / 60)}m)\nKick at **${c.warn_kick_at}** warns\nBan at **${c.warn_ban_at}** warns`, inline: false },
            { name: '📋 Whitelist',      value: wl.length ? wl.map((r) => `\`${r.type}\`: ${r.value}`).join('\n').slice(0, 1000) : 'Empty', inline: false },
          )
          .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // ── Config group ──────────────────────────────────────────
    if (group === 'config') {
      const fields = {};

      if (sub === 'antispam') {
        const threshold   = interaction.options.getInteger('threshold');
        const interval    = interaction.options.getInteger('interval');
        const action      = interaction.options.getString('action');
        const timeoutMins = interaction.options.getInteger('timeout_mins');
        if (threshold   !== null) fields.antispam_threshold    = threshold;
        if (interval    !== null) fields.antispam_interval      = interval * 1000;
        if (action      !== null) fields.antispam_action        = action;
        if (timeoutMins !== null) fields.antispam_timeout_mins  = timeoutMins;
      } else if (sub === 'badwords') {
        const action  = interaction.options.getString('action');
        const enabled = interaction.options.getBoolean('enabled');
        if (action  !== null) fields.badwords_action  = action;
        if (enabled !== null) fields.badwords_enabled = boolV(enabled);
      } else if (sub === 'links') {
        const invites  = interaction.options.getBoolean('block_invites');
        const external = interaction.options.getBoolean('block_external');
        const action   = interaction.options.getString('action');
        const enabled  = interaction.options.getBoolean('enabled');
        if (invites  !== null) fields.antilinks_invites  = boolV(invites);
        if (external !== null) fields.antilinks_external = boolV(external);
        if (action   !== null) fields.antilinks_action   = action;
        if (enabled  !== null) fields.antilinks_enabled  = boolV(enabled);
        invalidateLinkCache(guildId);
      } else if (sub === 'mentions') {
        const threshold = interaction.options.getInteger('threshold');
        const action    = interaction.options.getString('action');
        const enabled   = interaction.options.getBoolean('enabled');
        if (threshold !== null) fields.antimentions_threshold = threshold;
        if (action    !== null) fields.antimentions_action    = action;
        if (enabled   !== null) fields.antimentions_enabled   = boolV(enabled);
      } else if (sub === 'caps') {
        const pct       = interaction.options.getInteger('percentage');
        const minLen    = interaction.options.getInteger('min_length');
        const action    = interaction.options.getString('action');
        const enabled   = interaction.options.getBoolean('enabled');
        if (pct    !== null) fields.anticaps_threshold  = pct;
        if (minLen !== null) fields.anticaps_min_length = minLen;
        if (action !== null) fields.anticaps_action     = action;
        if (enabled !== null) fields.anticaps_enabled   = boolV(enabled);
      } else if (sub === 'emoji') {
        const threshold = interaction.options.getInteger('threshold');
        const action    = interaction.options.getString('action');
        const enabled   = interaction.options.getBoolean('enabled');
        if (threshold !== null) fields.antiemoji_threshold = threshold;
        if (action    !== null) fields.antiemoji_action    = action;
        if (enabled   !== null) fields.antiemoji_enabled   = boolV(enabled);
      } else if (sub === 'raid') {
        const threshold = interaction.options.getInteger('threshold');
        const interval  = interaction.options.getInteger('interval');
        const action    = interaction.options.getString('action');
        const enabled   = interaction.options.getBoolean('enabled');
        if (threshold !== null) fields.antiraid_threshold = threshold;
        if (interval  !== null) fields.antiraid_interval  = interval * 1000;
        if (action    !== null) fields.antiraid_action    = action;
        if (enabled   !== null) fields.antiraid_enabled   = boolV(enabled);
      } else if (sub === 'scam') {
        const enabled = interaction.options.getBoolean('enabled');
        fields.antiscam_enabled = boolV(enabled);
      } else if (sub === 'warns') {
        const timeoutAt  = interaction.options.getInteger('timeout_at');
        const kickAt     = interaction.options.getInteger('kick_at');
        const banAt      = interaction.options.getInteger('ban_at');
        const duration   = interaction.options.getInteger('timeout_duration');
        if (timeoutAt !== null) fields.warn_timeout_at       = timeoutAt;
        if (kickAt    !== null) fields.warn_kick_at          = kickAt;
        if (banAt     !== null) fields.warn_ban_at           = banAt;
        if (duration  !== null) fields.warn_timeout_duration = duration * 60;
      } else if (sub === 'logs') {
        const channel = interaction.options.getChannel('channel');
        fields.modlog_channel = channel.id;
      }

      if (!Object.keys(fields).length) {
        return interaction.editReply({ embeds: [warn('No settings were changed. Provide at least one option.')] });
      }
      db.setConfigFields(guildId, fields);
      return interaction.editReply({ embeds: [ok(`**${sub}** settings updated.`)] });
    }

    // ── Whitelist group ───────────────────────────────────────
    if (group === 'whitelist') {
      if (sub === 'add') {
        const type  = interaction.options.getString('type');
        const value = interaction.options.getString('value');
        db.addWhitelist(guildId, type, value);
        invalidateLinkCache(guildId);
        return interaction.editReply({ embeds: [ok(`Added \`${type}\` → \`${value}\` to the whitelist.`)] });
      }
      if (sub === 'remove') {
        const type  = interaction.options.getString('type');
        const value = interaction.options.getString('value');
        db.removeWhitelist(guildId, type, value);
        invalidateLinkCache(guildId);
        return interaction.editReply({ embeds: [ok(`Removed \`${type}\` → \`${value}\` from the whitelist.`)] });
      }
      if (sub === 'list') {
        const list = db.getWhitelist(guildId);
        if (!list.length) {
          return interaction.editReply({ embeds: [info('The whitelist is empty.')] });
        }
        const grouped = {};
        for (const r of list) {
          (grouped[r.type] ??= []).push(r.value);
        }
        const embed = new EmbedBuilder()
          .setTitle('📋 AutoMod Whitelist')
          .setColor(Colors.Blurple)
          .setTimestamp();
        for (const [type, values] of Object.entries(grouped)) {
          embed.addFields({ name: `**${type.toUpperCase()}**`, value: values.map((v) => `\`${v}\``).join(', ').slice(0, 1020) });
        }
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // ── Blacklist group ───────────────────────────────────────
    if (group === 'blacklist') {
      if (sub === 'add') {
        const word = interaction.options.getString('word').toLowerCase();
        db.addBlacklist(guildId, word);
        invalidateBlacklistCache(guildId);
        return interaction.editReply({ embeds: [ok(`Added \`${word}\` to the bad-words list.`)] });
      }
      if (sub === 'remove') {
        const word = interaction.options.getString('word').toLowerCase();
        db.removeBlacklist(guildId, word);
        invalidateBlacklistCache(guildId);
        return interaction.editReply({ embeds: [ok(`Removed \`${word}\` from the bad-words list.`)] });
      }
      if (sub === 'list') {
        const words = db.getBlacklist(guildId);
        if (!words.length) {
          return interaction.editReply({ embeds: [info('The bad-words list is empty.')] });
        }
        const embed = new EmbedBuilder()
          .setTitle('🤬 Bad-Words Blacklist')
          .setColor(Colors.Orange)
          .setDescription(words.map((w) => `\`${w}\``).join(', ').slice(0, 3900))
          .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      }
    }
  },
};

// ── Embed helpers ────────────────────────────────────────────
function ok(desc)   { return new EmbedBuilder().setColor(Colors.Green).setDescription(`✅ ${desc}`); }
function warn(desc) { return new EmbedBuilder().setColor(Colors.Yellow).setDescription(`⚠️ ${desc}`); }
function info(desc) { return new EmbedBuilder().setColor(Colors.Blurple).setDescription(`ℹ️ ${desc}`); }
