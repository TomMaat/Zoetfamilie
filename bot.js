const http = require('http');
const crypto = require('crypto');
const {
    Client,
    GatewayIntentBits,
    Partials,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
    ActivityType,
    MessageFlags,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    UserSelectMenuBuilder,
    StringSelectMenuBuilder,
    OverwriteType
} = require('discord.js');

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Familie Snus bot is online');
}).listen(PORT, () => {
    console.log(`HTTP server luistert op poort ${PORT}`);
});

const PURPLE = { main: '#9b59b6', dark: '#7d3c98', light: '#bb8fce', accent: '#a569bd', soft: '#d2b4de' };
const CASINO_GREEN = '#2ecc71';
const CASINO_RED = '#e74c3c';
const CASINO_GOLD = '#f1c40f';

const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GIST_ID: process.env.GIST_ID || '',
    SERVER_NAME: 'Familie Snus',
    LOGO_URL: 'https://cdn.discordapp.com/attachments/1567554042039771136/1567660546663383102/40134efe-7805-4254-90b6-79de4620ed6a.png',

    WELCOME_CHANNEL_ID: '1567280566041190410',
    VERIFY_CHANNEL_ID: '1567280670915436705',
    VERIFY_ROLE_ID: '1554510750092099690',
    VERIFY_BUTTON_ID: 'verify_click',

    SNAP_CHANNEL_ID: '1567284467347751042',
    SNAP_ROLE_ID: '1559951158951419954',
    SNAP_BUTTON_ID: 'snap_ping_click',

    HONEYPOT_CHANNEL_ID: '1567295355740229733',
    HONEYPOT_LOG_ID: '1567670737073078344',

    CALL_CHANNEL_ID: '1567542253633933402',
    CALL_CATEGORY_ID: '1567297941146829040',

    VERIFY_LOG_ID: '1567547632211988640',
    SNAP_LOG_ID: '1567547761912578141',
    CALL_LOG_ID: '1567547888119058562',
    JOIN_LEAVE_LOG_ID: '1567549266635788370',

    MEMBERS_LIST_CHANNEL_ID: '1567644680659927121',
    CUSTOM_ROLE_PANEL_CHANNEL_ID: '1567647760382038086',
    GIVEAWAY_CHANNEL_ID: '1567283972306636993',
    GIVEAWAY_LOG_ID: '1567663764181098636',
    ROLE_MANAGER_LOG_ID: '1567664373739163698',

    COUNTING_CHANNEL_ID: '1567875455921557574',
    CASINO_CHANNEL_ID: '1567863335620321401',
    CASINO_LEADERBOARD_CHANNEL_ID: '1567863557524033568',

    CUSTOM_ROLE_MANAGER_ROLE_ID: '1567237645057261689',
    GIVEAWAY_MANAGER_ROLE_ID: '1567237645057261689',

    ANTI_LINK_TIMEOUT_MS: 60 * 60 * 1000,
    ANTI_LINK_WINDOW_MS: 60 * 1000,
    ANTI_LINK_WARN_THRESHOLD: 3,

    MAX_CALLS_PER_USER: 1,

    EMPTY_CALL_TIMEOUT_MS: 60 * 60 * 1000,
    EMPTY_CALL_CHECK_MS: 5 * 60 * 1000,

    ANTINUKE_ALLOWED_USERS: ['1033753872927293520', '1559586201348866050'],
    ANTINUKE_LIMITS: { channelDelete: 3, roleDelete: 3, banAdd: 3, kickAdd: 3, memberRoleUpdate: 10 },
    ANTINUKE_WINDOW_MS: 10000,

    CHIP_GIVER_ID: '1033753872927293520',

    CASINO_EMBED_DELETE_AFTER_MS: 8000,
    CRASHER_TICK_MS: 400,
    CRASHER_STEP: 0.01,
    CRASHER_EDIT_EVERY_N_TICKS: 5,

    COUNTING_RESET_WAIT_MS: 4000
};

let customRoles = [];
let giveaways = {};
let countingState = {};
let casino = {};
let crashGames = new Map();
let blackjackGames = new Map();
let casinoPanelMessageId = null;
let casinoLeaderboardMessageId = null;

const GIST_FILE = 'zoet.json';
let gistId = CONFIG.GIST_ID;
let kickData = { total: 0 };
let antinukeData = { enabled: true };
let joinTimes = {};
let backups = {};
let gistReady = false;

async function gistRequest(method, endpoint, body) {
    const url = `https://api.github.com${endpoint}`;
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${CONFIG.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'Familie-Snus-Bot',
            'Content-Type': 'application/json'
        }
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub API ${res.status}: ${text}`);
    }
    return res.json();
}

async function initGist() {
    if (!CONFIG.GITHUB_TOKEN) { console.log('Geen GITHUB_TOKEN ingesteld, database uitgeschakeld.'); return; }
    try {
        if (gistId) {
            await gistRequest('GET', `/gists/${gistId}`);
            gistReady = true;
            console.log(`Gist geladen: ${gistId}`);
        } else {
            const gist = await gistRequest('POST', '/gists', {
                description: 'Familie Snus bot database',
                public: false,
                files: {
                    [GIST_FILE]: {
                        content: JSON.stringify({
                            kicks: { total: 0 }, antinuke: { enabled: true }, joinTimes: {}, customRoles: [],
                            backups: {}, giveaways: {}, countingState: {}, casino: {}
                        }, null, 2)
                    }
                }
            });
            gistId = gist.id; gistReady = true;
            console.log('========================================');
            console.log(`NIEUWE GIST AANGEMAAKT: ${gistId}`);
            console.log(`Zet GIST_ID=${gistId} in Render Environment`);
            console.log('========================================');
        }
        await loadFromGist();
    } catch (err) { console.error('Fout bij initialiseren gist:', err.message); }
}

async function loadFromGist() {
    if (!gistReady || !gistId) return;
    try {
        const gist = await gistRequest('GET', `/gists/${gistId}`);
        const file = gist.files[GIST_FILE];
        if (file?.content) {
            const data = JSON.parse(file.content);
            if (data.kicks) kickData = data.kicks;
            if (data.antinuke) antinukeData = data.antinuke;
            if (data.joinTimes) joinTimes = data.joinTimes;
            if (Array.isArray(data.customRoles)) customRoles = data.customRoles;
            if (data.backups) backups = data.backups;
            if (data.giveaways) giveaways = data.giveaways;
            if (data.countingState) countingState = data.countingState;
            if (data.casino) casino = data.casino;
        }
    } catch (err) { console.error('Fout bij laden database:', err.message); }
    console.log(`Database geladen: kicks=${kickData.total}, antinuke=${antinukeData.enabled}, customRoles=${customRoles.length}, giveaways=${Object.keys(giveaways).length}, casino=${Object.keys(casino).length}`);
}

async function saveToGist() {
    if (!gistReady || !gistId) return;
    try {
        await gistRequest('PATCH', `/gists/${gistId}`, {
            files: { [GIST_FILE]: { content: JSON.stringify({
                kicks: kickData, antinuke: antinukeData, joinTimes, customRoles,
                backups, giveaways, countingState, casino
            }, null, 2) } }
        });
    } catch (err) { console.error('Fout bij opslaan database:', err.message); }
}

const FONT_MAP = {
    a: '𝐚', b: '𝐛', c: '𝐜', d: '𝐝', e: '𝐞', f: '𝐟', g: '𝐠', h: '𝐡', i: '𝐢', j: '𝐣',
    k: '𝐤', l: '𝐥', m: '𝐦', n: '𝐧', o: '𝐨', p: '𝐩', q: '𝐪', r: '𝐫', s: '𝐬', t: '𝐭',
    u: '𝐮', v: '𝐯', w: '𝐰', x: '𝐱', y: '𝐲', z: '𝐳',
    A: '𝐀', B: '𝐁', C: '𝐂', D: '𝐃', E: '𝐄', F: '𝐅', G: '𝐆', H: '𝐇', I: '𝐈', J: '𝐉',
    K: '𝐊', L: '𝐋', M: '𝐌', N: '𝐍', O: '𝐎', P: '𝐏', Q: '𝐐', R: '𝐑', S: '𝐒', T: '𝐓',
    U: '𝐔', V: '𝐕', W: '𝐖', X: '𝐗', Y: '𝐘', Z: '𝐙',
    0: '𝟎', 1: '𝟏', 2: '𝟐', 3: '𝟑', 4: '𝟒', 5: '𝟓', 6: '𝟔', 7: '𝟕', 8: '𝟖', 9: '𝟗'
};
function toFont(text) { return text.split('').map(ch => FONT_MAP[ch] || ch).join(''); }

function formatDuration(ms) {
    const sec = Math.floor(ms / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}u`);
    if (m > 0) parts.push(`${m}m`);
    if (parts.length === 0 || s > 0) parts.push(`${s}s`);
    return parts.join(' ');
}

function parseDurationInput(input) {
    if (!input) return null;
    const match = input.toLowerCase().trim().match(/^(\d+)\s*([smhdwu])$/);
    if (!match) return null;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, u: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000, w: 7 * 24 * 60 * 60 * 1000 };
    if (!multipliers[unit]) return null;
    return value * multipliers[unit];
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

const actionTracker = new Map();
const activeCalls = new Map();
const callAllowed = new Map();
const roleCountCache = new Map();
const callInfoMessages = new Map();
const linkTracker = new Map();

let membersListMessageId = null;
let membersUpdateTimeout = null;
let customRolePanelMessageId = null;

function isCustomRoleManager(interaction) {
    if (!interaction.member) return false;
    return interaction.member.roles?.cache?.has(CONFIG.CUSTOM_ROLE_MANAGER_ROLE_ID) || false;
}
function isGiveawayManager(interaction) {
    if (!interaction.member) return false;
    return interaction.member.roles?.cache?.has(CONFIG.GIVEAWAY_MANAGER_ROLE_ID) || false;
}
function isBackupManager(userId) { return CONFIG.ANTINUKE_ALLOWED_USERS.includes(userId); }

async function countRoleMembers(guild, roleId, forceFetch = false) {
    const now = Date.now();
    const cached = roleCountCache.get(roleId);
    if (!forceFetch && cached && now - cached.fetchedAt < 60000) return cached.count;
    if (forceFetch) { try { await guild.members.fetch(); } catch (err) {} }
    const role = guild.roles.cache.get(roleId);
    const count = role ? role.members.size : 0;
    roleCountCache.set(roleId, { count, fetchedAt: now });
    return count;
}

async function cleanupOldPanels(channel, markerText) {
    try {
        const messages = await channel.messages.fetch({ limit: 50 });
        const old = messages.filter(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].description && m.embeds[0].description.includes(markerText));
        for (const msg of old.values()) await msg.delete().catch(() => {});
    } catch (err) {}
}

async function clearChannel(channel) {
    try {
        let fetched;
        do {
            fetched = await channel.messages.fetch({ limit: 100 });
            if (fetched.size === 0) break;
            const recent = fetched.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
            const old = fetched.filter(m => Date.now() - m.createdTimestamp >= 14 * 24 * 60 * 60 * 1000);
            if (recent.size > 1) await channel.bulkDelete(recent, true).catch(() => {});
            else if (recent.size === 1) await recent.first().delete().catch(() => {});
            for (const m of old.values()) await m.delete().catch(() => {});
        } while (fetched.size > 0);
    } catch (err) {}
}

function updateStatus(guild) { if (!guild) return; client.user.setActivity(`${guild.memberCount} leden`, { type: ActivityType.Watching }); }

async function refreshPanel(channelId, buttonId, emoji, style, roleId) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;
        const messages = await channel.messages.fetch({ limit: 20 });
        const panel = messages.find(m => m.author.id === client.user.id && m.components.length > 0 && m.components[0].components.some(b => b.customId === buttonId));
        if (!panel) return;
        const count = await countRoleMembers(channel.guild, roleId, false);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(buttonId).setLabel(`${count}`).setEmoji(emoji).setStyle(style));
        await panel.edit({ components: [row] }).catch(() => {});
    } catch (err) {}
}

async function sendLog(guild, channelId, { title, description, color, thumbnail }) {
    try {
        const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
        if (!channel) return;
        const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color || PURPLE.main).setTimestamp();
        if (thumbnail) embed.setThumbnail(thumbnail); else embed.setThumbnail(CONFIG.LOGO_URL);
        await channel.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {}
}

function scheduleDelete(message, ms = CONFIG.CASINO_EMBED_DELETE_AFTER_MS) {
    if (!message) return;
    setTimeout(() => { message.delete().catch(() => {}); }, ms);
}

function buildHoneypotEmbed() {
    return new EmbedBuilder()
        .setTitle('🍯 Dit is een honeypot kanaal!')
        .setDescription(
            '⚡ **Actie:** KICK\n\n' +
            '**PLAATS HIER NIETS** - Elk bericht, elke afbeelding, bijlage of sticker die hier geplaatst wordt, zorgt ervoor dat je **direct** gekickt wordt. Geen uitzonderingen!\n\n' +
            `**Totaal aantal kicks:** ${kickData.total}\n\n` +
            '🛡️ **Dit kanaal wordt 24/7 automatisch gecontroleerd**'
        )
        .setColor(PURPLE.main).setThumbnail(CONFIG.LOGO_URL);
}

async function refreshHoneypotEmbed(channel) {
    try {
        const messages = await channel.messages.fetch({ limit: 50 });
        const panel = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].description && m.embeds[0].description.includes('honeypot kanaal'));
        if (!panel) return;
        await panel.edit({ embeds: [buildHoneypotEmbed()] }).catch(() => {});
    } catch (err) {}
}

function getSortedCustomRoles() { return [...customRoles].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); }

function buildMembersEmbed(guild) {
    let body = '';
    const uniqueMembers = new Set();
    for (const cr of getSortedCustomRoles()) {
        const role = guild.roles.cache.get(cr.roleId);
        if (!role) { body += `**${cr.name} (0)**\n➤ Rol niet gevonden\n\n`; continue; }
        const members = [...role.members.values()].map(m => ({ id: m.id, name: m.displayName })).sort((a, b) => a.name.localeCompare(b.name));
        for (const m of members) uniqueMembers.add(m.id);
        body += `**${cr.name} (${members.length})**\n`;
        if (members.length > 0) for (const m of members) body += `➤ <@${m.id}>\n`;
        else body += `➤ Geen leden\n`;
        body += `\n`;
    }
    if (body.trim() === '') body = '_Nog geen rollen in de database._';
    return new EmbedBuilder()
        .setTitle('Familie Snus Ledenlijst')
        .setColor(PURPLE.main)
        .setDescription(`**Totale Familie Snus: ${uniqueMembers.size} leden**\n\n${body}`.slice(0, 4096))
        .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL })
        .setThumbnail(CONFIG.LOGO_URL).setTimestamp();
}

async function updateMembersList() {
    try {
        const guild = client.guilds.cache.first();
        if (!guild) return;
        const channel = await client.channels.fetch(CONFIG.MEMBERS_LIST_CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isTextBased()) return;
        const payload = { embeds: [buildMembersEmbed(guild)], allowedMentions: { parse: [] } };
        if (membersListMessageId) {
            try { const existing = await channel.messages.fetch(membersListMessageId); await existing.edit(payload); return; }
            catch (err) { membersListMessageId = null; }
        }
        try { const fetched = await channel.messages.fetch({ limit: 50 }); for (const m of fetched.filter(m => m.author.id === client.user.id).values()) await m.delete().catch(() => {}); } catch (err) {}
        const sent = await channel.send(payload);
        membersListMessageId = sent.id;
    } catch (err) {}
}

function scheduleMembersUpdate() {
    if (membersUpdateTimeout) return;
    membersUpdateTimeout = setTimeout(() => { membersUpdateTimeout = null; updateMembersList().catch(() => {}); }, 3000);
}

function buildCustomRolePanelEmbed() {
    let list = '';
    const sorted = getSortedCustomRoles();
    const guild = client.guilds.cache.first();
    if (sorted.length === 0) list = '_Nog geen custom rollen._';
    else for (let i = 0; i < sorted.length; i++) {
        const role = guild?.roles.cache.get(sorted[i].roleId);
        list += `**${i + 1}. ${role ? role.name : sorted[i].name}** — <@&${sorted[i].roleId}>\n`;
    }
    return new EmbedBuilder()
        .setTitle('Custom Roles Beheer')
        .setDescription('Beheer hier de custom rollen van **Familie Snus**.\n\n**Huidige custom rollen:**\n' + list + '\n\nAlleen leden met de rol manager kunnen rollen beheren.')
        .setColor(PURPLE.main).setThumbnail(CONFIG.LOGO_URL).setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL }).setTimestamp();
}

function buildCustomRolePanelRows() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('cr_add').setLabel('Rol toevoegen').setEmoji('➕').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('cr_remove').setLabel('Rol verwijderen').setEmoji('➖').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cr_rename').setLabel('Rol hernoemen').setEmoji('✏️').setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('cr_up').setLabel('Omhoog').setEmoji('⬆️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('cr_down').setLabel('Omlaag').setEmoji('⬇️').setStyle(ButtonStyle.Primary)
        )
    ];
}

async function updateCustomRolePanel() {
    try {
        const channel = await client.channels.fetch(CONFIG.CUSTOM_ROLE_PANEL_CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isTextBased()) return;
        const payload = { embeds: [buildCustomRolePanelEmbed()], components: buildCustomRolePanelRows() };
        if (customRolePanelMessageId) {
            try { const existing = await channel.messages.fetch(customRolePanelMessageId); await existing.edit(payload); return; }
            catch (err) { customRolePanelMessageId = null; }
        }
        try { const fetched = await channel.messages.fetch({ limit: 50 }); for (const m of fetched.filter(m => m.author.id === client.user.id).values()) await m.delete().catch(() => {}); } catch (err) {}
        const sent = await channel.send(payload);
        customRolePanelMessageId = sent.id;
    } catch (err) {}
}

async function handleAntiLink(message) {
    if (message.author.bot) return false;
    if (!message.guild) return false;
    if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;
    if (message.member?.roles?.cache?.has(CONFIG.CUSTOM_ROLE_MANAGER_ROLE_ID)) return false;
    const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.gg\/[^\s]+)/i;
    if (!linkRegex.test(message.content || '')) return false;
    const userId = message.author.id;
    const now = Date.now();
    const timestamps = (linkTracker.get(userId) || []).filter(t => now - t < CONFIG.ANTI_LINK_WINDOW_MS);
    timestamps.push(now);
    linkTracker.set(userId, timestamps);
    if (timestamps.length < CONFIG.ANTI_LINK_WARN_THRESHOLD) return false;
    if (timestamps.length === CONFIG.ANTI_LINK_WARN_THRESHOLD) {
        await message.channel.send({ content: `${message.author} - Je hebt **3 links** in 1 minuut gestuurd. Nog 1 link = **1 uur timeout**.` }).catch(() => {});
        return false;
    }
    try {
        await message.delete().catch(() => {});
        await message.channel.send({ content: `${message.author} - Link verwijderd. Je krijgt **1 uur timeout** voor anti-link spam.` }).catch(() => {});
        if (message.member?.moderatable) await message.member.timeout(CONFIG.ANTI_LINK_TIMEOUT_MS, 'Anti-link spam').catch(() => {});
        linkTracker.delete(userId);
        return true;
    } catch (err) { return true; }
}

// --- COUNTING ---
function buildCountingEmbed(state) {
    return new EmbedBuilder()
        .setTitle('🔢 Tel-spel')
        .setDescription(`**Huidige stand:** ${state?.current || 0}\n**Highscore:** ${state?.highScore || 0}\n\n**Regels:**\n• Typ het juiste volgende getal.\n• Je mag niet 2x achter elkaar typen.\n• Typ je iets anders of fout, dan begint het spel opnieuw bij 1.`)
        .setColor(PURPLE.main).setThumbnail(CONFIG.LOGO_URL).setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL }).setTimestamp();
}

async function resetCountingChannel(state) {
    try {
        const channel = await client.channels.fetch(CONFIG.COUNTING_CHANNEL_ID).catch(() => null);
        if (!channel) return null;
        let fetched;
        do {
            fetched = await channel.messages.fetch({ limit: 100 }).catch(() => null);
            if (!fetched || fetched.size === 0) break;
            const recent = fetched.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
            const old = fetched.filter(m => Date.now() - m.createdTimestamp >= 14 * 24 * 60 * 60 * 1000);
            if (recent.size > 1) await channel.bulkDelete(recent, true).catch(() => {});
            else if (recent.size === 1) await recent.first().delete().catch(() => {});
            for (const m of old.values()) await m.delete().catch(() => {});
        } while (fetched && fetched.size > 0);
        const sent = await channel.send({ embeds: [buildCountingEmbed(state)] });
        state.lastMessageId = sent.id;
        countingState[CONFIG.COUNTING_CHANNEL_ID] = state;
        await saveToGist();
        return sent.id;
    } catch (err) { console.error('Fout bij reset counting channel:', err.message); return null; }
}

async function updateCountingEmbed(state) {
    try {
        const channel = await client.channels.fetch(CONFIG.COUNTING_CHANNEL_ID).catch(() => null);
        if (!channel) return;
        if (state.lastMessageId) {
            try { const msg = await channel.messages.fetch(state.lastMessageId); await msg.edit({ embeds: [buildCountingEmbed(state)] }); return; }
            catch (e) { state.lastMessageId = null; }
        }
        const sent = await channel.send({ embeds: [buildCountingEmbed(state)] });
        state.lastMessageId = sent.id;
        countingState[CONFIG.COUNTING_CHANNEL_ID] = state;
        await saveToGist();
    } catch (err) { console.error('Fout bij update counting embed:', err.message); }
}

async function handleCountingMessage(message) {
    if (message.author.bot) return;
    if (message.channel.id !== CONFIG.COUNTING_CHANNEL_ID) return;

    const state = countingState[message.channel.id] || { current: 0, lastUserId: null, highScore: 0, lastMessageId: null };
    const match = message.content.trim().match(/^(\d+)$/);

    // Reset: eerst foutmelding tonen, wachten, dan pas wissen + nieuwe embed
    const reset = async (errorText) => {
        try {
            const channel = await client.channels.fetch(CONFIG.COUNTING_CHANNEL_ID);
            await channel.send({ content: errorText }).catch(() => {});
            await new Promise(r => setTimeout(r, CONFIG.COUNTING_RESET_WAIT_MS));
        } catch (e) {}

        state.current = 0;
        state.lastUserId = null;
        countingState[message.channel.id] = state;
        await saveToGist();
        await resetCountingChannel(state);
    };

    if (!match) {
        return reset(`❌ ${message.author} - Geen geldig getal. Het spel begint opnieuw bij **1**.`);
    }

    const typed = parseInt(match[1], 10);

    if (state.lastUserId === message.author.id) {
        return reset(`❌ ${message.author} - Je mag niet 2x achter elkaar typen. Het spel begint opnieuw bij **1**.`);
    }

    if (typed !== state.current + 1) {
        return reset(`❌ ${message.author} - Fout! Je moest **${state.current + 1}** typen. Het spel begint opnieuw bij **1**.`);
    }

    // Geldige zet: ✅ reactie, stand ophogen, embed update
    state.current = typed;
    state.lastUserId = message.author.id;
    if (state.current > (state.highScore || 0)) state.highScore = state.current;
    countingState[message.channel.id] = state;
    await saveToGist();

    await message.react('✅').catch(() => {});
    await updateCountingEmbed(state);
}

// --- CASINO ---
function getCasinoUser(userId) {
    if (!casino[userId]) casino[userId] = { chips: 100, wins: 0, losses: 0, gamesPlayed: 0 };
    return casino[userId];
}
function resetCasinoUser(userId) { casino[userId] = { chips: 100, wins: 0, losses: 0, gamesPlayed: 0 }; return casino[userId]; }

function buildCasinoPanelEmbed() {
    return new EmbedBuilder()
        .setTitle('Familie Snus Casino')
        .setDescription('**Welkom in het casino!**\n\nIedereen begint met **100 chips**.\n\n**Games:**\n• `/blackjack <inzet>`\n• `/roulette <inzet> <kleur>`\n• `/crasher <inzet> [auto_cashout]`\n\n**Beloningen:**\n• Blackjack: 2x\n• Roulette rood/zwart: 2x\n• Roulette groen: 14x\n• Crasher: tot 25x (crash kan elk moment)\n\n**Tip:** Bekijk je chips met `/chips`.')
        .setColor(CASINO_GOLD).setThumbnail(CONFIG.LOGO_URL).setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL }).setTimestamp();
}

function buildCasinoLeaderboardEmbed() {
    const entries = Object.entries(casino).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.chips - a.chips).slice(0, 10);
    let body = '';
    if (entries.length === 0) body = '_Nog geen spelers._';
    else {
        const medals = ['🥇', '🥈', '🥉'];
        entries.forEach((e, i) => { body += `${medals[i] || `**${i + 1}.**`} <@${e.id}> — **${e.chips} chips**\n`; });
    }
    return new EmbedBuilder().setTitle('Casino Leaderboard — Top 10').setDescription(`**Rijkste spelers:**\n\n${body}`).setColor(CASINO_GOLD).setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL }).setTimestamp();
}

async function updateCasinoLeaderboard() {
    try {
        const channel = await client.channels.fetch(CONFIG.CASINO_LEADERBOARD_CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isTextBased()) return;
        const payload = { embeds: [buildCasinoLeaderboardEmbed()] };
        if (casinoLeaderboardMessageId) {
            try { const m = await channel.messages.fetch(casinoLeaderboardMessageId); await m.edit(payload); return; }
            catch (e) { casinoLeaderboardMessageId = null; }
        }
        try { const fetched = await channel.messages.fetch({ limit: 20 }); for (const m of fetched.filter(m => m.author.id === client.user.id).values()) await m.delete().catch(() => {}); } catch (e) {}
        const sent = await channel.send(payload);
        casinoLeaderboardMessageId = sent.id;
    } catch (err) {}
}

async function updateCasinoPanel() {
    try {
        const channel = await client.channels.fetch(CONFIG.CASINO_CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isTextBased()) return;
        const payload = { embeds: [buildCasinoPanelEmbed()] };
        if (casinoPanelMessageId) {
            try { const m = await channel.messages.fetch(casinoPanelMessageId); await m.edit(payload); return; }
            catch (e) { casinoPanelMessageId = null; }
        }
        try { const fetched = await channel.messages.fetch({ limit: 20 }); for (const m of fetched.filter(m => m.author.id === client.user.id).values()) await m.delete().catch(() => {}); } catch (e) {}
        const sent = await channel.send(payload);
        casinoPanelMessageId = sent.id;
    } catch (err) {}
}

// --- BLACKJACK ---
const BJ_SUITS = ['♠️', '♥️', '♦️', '♣️'];
const BJ_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const bjDraw = () => ({ suit: BJ_SUITS[Math.floor(Math.random() * 4)], rank: BJ_RANKS[Math.floor(Math.random() * 13)] });
const bjVal = (c) => c.rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(c.rank) ? 10 : parseInt(c.rank, 10);
const bjTotal = (h) => { let t = 0, a = 0; for (const c of h) { t += bjVal(c); if (c.rank === 'A') a++; } while (t > 21 && a > 0) { t -= 10; a--; } return t; };

function bjHandStr(hand) {
    if (!hand || hand.length === 0) return '_geen kaarten_';
    return hand.map(c => `\`${c.rank}${c.suit}\``).join(' ');
}
function bjDealerHidden(dealer) {
    if (!dealer || dealer.length === 0) return '_geen kaarten_';
    const first = `\`${dealer[0].rank}${dealer[0].suit}\``;
    const rest = dealer.slice(1).map(() => '`🂠`').join(' ');
    return `${first} ${rest}`;
}
function bjBuildEmbed(game, status, color, revealDealer = false) {
    const pt = bjTotal(game.player);
    const dt = bjTotal(game.dealer);
    let dealerLine, dealerTotal;
    if (revealDealer) { dealerLine = bjHandStr(game.dealer); dealerTotal = `${dt}`; }
    else { dealerLine = bjDealerHidden(game.dealer); dealerTotal = `${bjVal(game.dealer[0])} + ?`; }
    return new EmbedBuilder()
        .setTitle('Blackjack')
        .setColor(color || CASINO_GOLD)
        .addFields(
            { name: 'Dealer', value: `${dealerLine}\nTotaal: **${dealerTotal}**`, inline: false },
            { name: `Jouw hand (${pt})`, value: bjHandStr(game.player), inline: false },
            { name: 'Inzet', value: `${game.bet} chips`, inline: true },
            { name: 'Resultaat', value: status, inline: true }
        );
}
function bjBuildRows(gameId) {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bj_hit_${gameId}`).setLabel('Hit').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bj_stand_${gameId}`).setLabel('Stand').setStyle(ButtonStyle.Success)
    )];
}

async function finishBlackjack(interaction, game, reason, isUpdate = false) {
    game.finished = true;
    blackjackGames.delete(game.id || '');
    const pt = bjTotal(game.player);
    let result, payout, color;
    if (reason === 'player_blackjack') { result = '**BLACKJACK!** Je wint 2x.'; payout = game.bet * 2; color = CASINO_GREEN; }
    else if (pt > 21) { result = `**Bust.** Je hebt **${pt}**. Je verliest.`; payout = 0; color = CASINO_RED; }
    else {
        while (bjTotal(game.dealer) < 17) game.dealer.push(bjDraw());
        const dt = bjTotal(game.dealer);
        if (dt > 21) { result = `**Dealer bust** (${dt}). Je wint!`; payout = game.bet * 2; color = CASINO_GREEN; }
        else if (pt > dt) { result = `**Je wint.** Jij **${pt}** vs dealer **${dt}**.`; payout = game.bet * 2; color = CASINO_GREEN; }
        else if (pt < dt) { result = `**Je verliest.** Jij **${pt}** vs dealer **${dt}**.`; payout = 0; color = CASINO_RED; }
        else { result = `**Gelijkspel.** Beide **${pt}**. Inzet terug.`; payout = game.bet; color = CASINO_GOLD; }
    }
    const user = getCasinoUser(game.userId);
    user.chips += payout;
    if (payout > game.bet) user.wins += 1;
    else if (payout === 0) user.losses += 1;
    user.gamesPlayed += 1;
    await saveToGist();

    const embed = bjBuildEmbed(game, result, color, true);
    await updateCasinoLeaderboard();
    await updateCasinoPanel();

    let sentMsg;
    if (isUpdate) { sentMsg = await interaction.update({ embeds: [embed], components: [] }).catch(() => null); }
    else { sentMsg = await interaction.reply({ embeds: [embed], fetchReply: true }).catch(() => null); }
    scheduleDelete(sentMsg, CONFIG.CASINO_EMBED_DELETE_AFTER_MS);
}

async function playBlackjack(interaction, bet) {
    const user = getCasinoUser(interaction.user.id);
    if (user.chips <= 0) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('casino_reset').setLabel('Reset naar 100 chips').setStyle(ButtonStyle.Success));
        return interaction.reply({ content: 'Je hebt 0 chips. Reset naar 100 chips.', components: [row], flags: MessageFlags.Ephemeral });
    }
    if (bet < 1) return interaction.reply({ content: 'Minstens 1 chip.', flags: MessageFlags.Ephemeral });
    if (bet > user.chips) return interaction.reply({ content: `Je hebt maar ${user.chips} chips.`, flags: MessageFlags.Ephemeral });

    const player = [bjDraw(), bjDraw()];
    const dealer = [bjDraw(), bjDraw()];
    user.chips -= bet;
    await saveToGist();

    const gameId = `${interaction.user.id}_${Date.now()}`;
    const game = { id: gameId, userId: interaction.user.id, bet, player, dealer, finished: false };
    blackjackGames.set(gameId, game);

    if (bjTotal(player) === 21) return finishBlackjack(interaction, game, 'player_blackjack', false);

    await interaction.reply({
        embeds: [bjBuildEmbed(game, 'Kies Hit of Stand.', CASINO_GOLD)],
        components: bjBuildRows(gameId)
    });
}

async function handleBjHit(interaction, gameId) {
    const game = blackjackGames.get(gameId);
    if (!game) return interaction.reply({ content: 'Deze game is verlopen.', flags: MessageFlags.Ephemeral });
    if (game.userId !== interaction.user.id) return interaction.reply({ content: 'Dit is niet jouw game.', flags: MessageFlags.Ephemeral });
    if (game.finished) return interaction.reply({ content: 'Deze game is al klaar.', flags: MessageFlags.Ephemeral });

    game.player.push(bjDraw());
    const pt = bjTotal(game.player);
    if (pt > 21) return finishBlackjack(interaction, game, 'player_bust', true);
    if (pt === 21) return finishBlackjack(interaction, game, 'player_stand', true);

    return interaction.update({
        embeds: [bjBuildEmbed(game, 'Kies Hit of Stand.', CASINO_GOLD)],
        components: bjBuildRows(gameId)
    });
}

async function handleBjStand(interaction, gameId) {
    const game = blackjackGames.get(gameId);
    if (!game) return interaction.reply({ content: 'Deze game is verlopen.', flags: MessageFlags.Ephemeral });
    if (game.userId !== interaction.user.id) return interaction.reply({ content: 'Dit is niet jouw game.', flags: MessageFlags.Ephemeral });
    if (game.finished) return interaction.reply({ content: 'Deze game is al klaar.', flags: MessageFlags.Ephemeral });
    return finishBlackjack(interaction, game, 'player_stand', true);
}

// --- ROULETTE ---
async function playRoulette(interaction, bet, choice) {
    const user = getCasinoUser(interaction.user.id);
    if (user.chips <= 0) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('casino_reset').setLabel('Reset naar 100 chips').setStyle(ButtonStyle.Success));
        return interaction.reply({ content: 'Je hebt 0 chips. Reset naar 100 chips.', components: [row], flags: MessageFlags.Ephemeral });
    }
    if (bet < 1) return interaction.reply({ content: 'Minstens 1 chip.', flags: MessageFlags.Ephemeral });
    if (bet > user.chips) return interaction.reply({ content: `Je hebt maar ${user.chips} chips.`, flags: MessageFlags.Ephemeral });

    const c = choice.toLowerCase();
    if (!['rood', 'zwart', 'groen'].includes(c)) return interaction.reply({ content: 'Kies rood, zwart of groen.', flags: MessageFlags.Ephemeral });

    user.chips -= bet;
    const n = Math.floor(Math.random() * 37);
    const isGreen = n === 0;
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const isRed = !isGreen && redNumbers.includes(n);

    let result, payout, color;
    if (isGreen) {
        color = CASINO_GREEN; result = `${n} GROEN!`;
        if (c === 'groen') { payout = bet * 14; result += ' Je wint 14x!'; }
        else { payout = 0; result += ' Je verliest.'; color = CASINO_RED; }
    } else if (isRed) {
        color = CASINO_RED; result = `${n} ROOD!`;
        if (c === 'rood') { payout = bet * 2; result += ' Je wint 2x!'; color = CASINO_GREEN; }
        else { payout = 0; result += ' Je verliest.'; }
    } else {
        color = '#2b2b2b'; result = `${n} ZWART!`;
        if (c === 'zwart') { payout = bet * 2; result += ' Je wint 2x!'; color = CASINO_GREEN; }
        else { payout = 0; result += ' Je verliest.'; }
    }

    const newChips = Math.max(0, user.chips + payout);
    casino[interaction.user.id] = { chips: newChips, wins: user.wins + (payout > bet ? 1 : 0), losses: user.losses + (payout === 0 ? 1 : 0), gamesPlayed: user.gamesPlayed + 1 };
    await saveToGist();

    const embed = new EmbedBuilder()
        .setTitle('Roulette')
        .setDescription(`**${result}**\n\n**Jouw keuze:** ${c}\n**Inzet:** ${bet} chips\n**Uitbetaling:** ${payout} chips\n**Nieuwe balans:** ${newChips} chips`)
        .setColor(color).setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL }).setTimestamp();

    const sentMsg = await interaction.reply({ embeds: [embed], fetchReply: true });
    scheduleDelete(sentMsg, CONFIG.CASINO_EMBED_DELETE_AFTER_MS);
    await updateCasinoLeaderboard();
    await updateCasinoPanel();
}

// --- CRASHER ---
function buildCrasherEmbed(game, multiplier, status, color) {
    return new EmbedBuilder()
        .setTitle('Crasher')
        .setDescription(
            `**Inzet:** ${game.bet} chips\n` +
            `**Huidige multiplier:** **${multiplier.toFixed(2)}x**\n` +
            `**Mogelijke winst:** ${Math.floor(game.bet * multiplier)} chips\n` +
            (game.autoCashout ? `**Auto cashout:** ${game.autoCashout.toFixed(2)}x\n` : '') +
            `\n${status}`
        )
        .setColor(color || (multiplier >= 2 ? CASINO_GREEN : CASINO_GOLD))
        .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL }).setTimestamp();
}
function buildCrasherRows(gameId, active) {
    if (!active) return [];
    return [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`crash_cashout_${gameId}`).setLabel('Cash Out').setStyle(ButtonStyle.Success))];
}

async function playCrasher(interaction, bet, autoCashout = null) {
    const user = getCasinoUser(interaction.user.id);
    if (user.chips <= 0) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('casino_reset').setLabel('Reset naar 100 chips').setStyle(ButtonStyle.Success));
        return interaction.reply({ content: 'Je hebt 0 chips. Reset naar 100 chips.', components: [row], flags: MessageFlags.Ephemeral });
    }
    if (bet < 1) return interaction.reply({ content: 'Minstens 1 chip.', flags: MessageFlags.Ephemeral });
    if (bet > user.chips) return interaction.reply({ content: `Je hebt maar ${user.chips} chips.`, flags: MessageFlags.Ephemeral });
    if (autoCashout !== null && (autoCashout < 1.1 || autoCashout > 25)) {
        return interaction.reply({ content: 'Auto cashout moet tussen **1.10x** en **25.00x** liggen.', flags: MessageFlags.Ephemeral });
    }

    user.chips -= bet;
    await saveToGist();

    const gameId = `${interaction.user.id}_${Date.now()}`;
    const crashPoint = (Math.random() * 23.8) + 1.2;
    const game = { userId: interaction.user.id, bet, multiplier: 1.00, crashPoint, autoCashout, finished: false, interval: null, tick: 0 };
    crashGames.set(gameId, game);

    await interaction.reply({
        embeds: [buildCrasherEmbed(game, 1.00, 'Klik op **Cash Out** voordat de multiplier crasht!')],
        components: buildCrasherRows(gameId, true)
    });

    const message = await interaction.fetchReply();

    game.interval = setInterval(async () => {
        if (game.finished) { clearInterval(game.interval); return; }
        game.multiplier += CONFIG.CRASHER_STEP;
        game.multiplier = Math.round(game.multiplier * 100) / 100;
        game.tick++;

        if (game.autoCashout !== null && game.multiplier >= game.autoCashout && game.multiplier < game.crashPoint) {
            game.finished = true;
            clearInterval(game.interval);
            crashGames.delete(gameId);
            const winnings = Math.floor(game.bet * game.autoCashout);
            const u = getCasinoUser(game.userId);
            u.chips += winnings;
            u.wins += 1;
            u.gamesPlayed += 1;
            await saveToGist();
            const finalEmbed = buildCrasherEmbed(game, game.autoCashout, `**Auto Cash Out!** Je wint **${winnings} chips** op **${game.autoCashout.toFixed(2)}x**!`, CASINO_GREEN);
            await message.edit({ embeds: [finalEmbed], components: [] }).catch(() => {});
            scheduleDelete(message, CONFIG.CASINO_EMBED_DELETE_AFTER_MS);
            await updateCasinoLeaderboard();
            await updateCasinoPanel();
            return;
        }

        if (game.multiplier >= game.crashPoint || game.multiplier >= 25) {
            game.finished = true;
            clearInterval(game.interval);
            crashGames.delete(gameId);
            const u = getCasinoUser(game.userId);
            u.losses += 1;
            u.gamesPlayed += 1;
            await saveToGist();
            const finalEmbed = buildCrasherEmbed(game, game.multiplier, `**CRASH!** De multiplier klapte op **${game.crashPoint.toFixed(2)}x**. Je verliest **${game.bet} chips**.`, CASINO_RED);
            await message.edit({ embeds: [finalEmbed], components: [] }).catch(() => {});
            scheduleDelete(message, CONFIG.CASINO_EMBED_DELETE_AFTER_MS);
            await updateCasinoLeaderboard();
            await updateCasinoPanel();
            return;
        }

        if (game.tick % CONFIG.CRASHER_EDIT_EVERY_N_TICKS === 0) {
            await message.edit({ embeds: [buildCrasherEmbed(game, game.multiplier, 'Klik op **Cash Out** voordat de multiplier crasht!')], components: buildCrasherRows(gameId, true) }).catch(() => {});
        }
    }, CONFIG.CRASHER_TICK_MS);
}

async function handleCrashCashout(interaction, gameId) {
    const game = crashGames.get(gameId);
    if (!game) return interaction.reply({ content: 'Deze game is verlopen.', flags: MessageFlags.Ephemeral });
    if (game.userId !== interaction.user.id) return interaction.reply({ content: 'Dit is niet jouw game.', flags: MessageFlags.Ephemeral });
    game.finished = true;
    clearInterval(game.interval);
    crashGames.delete(gameId);
    const winnings = Math.floor(game.bet * game.multiplier);
    const u = getCasinoUser(game.userId);
    u.chips += winnings;
    u.wins += 1;
    u.gamesPlayed += 1;
    await saveToGist();
    const finalEmbed = buildCrasherEmbed(game, game.multiplier, `**Cash Out!** Je wint **${winnings} chips** op **${game.multiplier.toFixed(2)}x**!`, CASINO_GREEN);
    await interaction.update({ embeds: [finalEmbed], components: [] });
    scheduleDelete(await interaction.fetchReply().catch(() => null), CONFIG.CASINO_EMBED_DELETE_AFTER_MS);
    await updateCasinoLeaderboard();
    await updateCasinoPanel();
}

// --- GIVEAWAY ---
function buildGiveawayEmbed(gw) {
    return new EmbedBuilder()
        .setTitle(gw.ended ? 'Giveaway afgelopen' : 'Giveaway')
        .setDescription(`**Prijs:** ${gw.prize}\n\n` + (gw.ended ? `**Winnaar(s):** ${gw.winners?.map(id => `<@${id}>`).join(', ') || '_Geen deelnemers_'}` : `**Eindigt:** <t:${Math.floor(gw.endsAt / 1000)}:R>\n**Deelnemers:** ${gw.participants.length}`))
        .setColor(PURPLE.main).setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL }).setTimestamp();
}
function buildGiveawayRows(messageId, ended) {
    if (!ended) return [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`gw_join_${messageId}`).setLabel('Deelnemen').setStyle(ButtonStyle.Success))];
    return [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`gw_reroll_${messageId}`).setLabel('Reroll').setStyle(ButtonStyle.Primary))];
}
async function startGiveawayTimer(messageId) {
    const gw = giveaways[messageId];
    if (!gw) return;
    setTimeout(async () => { await endGiveaway(messageId); }, Math.max(0, gw.endsAt - Date.now()));
}
async function endGiveaway(messageId) {
    const gw = giveaways[messageId];
    if (!gw || gw.ended) return;
    gw.ended = true;
    if (gw.participants.length === 0) gw.winners = [];
    else {
        const winners = [];
        const pool = [...gw.participants];
        for (let i = 0; i < Math.min(gw.winnersCount || 1, pool.length); i++) {
            const idx = Math.floor(Math.random() * pool.length);
            winners.push(pool[idx]);
            pool.splice(idx, 1);
        }
        gw.winners = winners;
    }
    await saveToGist();
    try {
        const channel = await client.channels.fetch(gw.channelId);
        const msg = await channel.messages.fetch(messageId);
        await msg.edit({ embeds: [buildGiveawayEmbed(gw)], components: buildGiveawayRows(messageId, true) });
        if (gw.winners.length > 0) await channel.send(`Gefeliciteerd ${gw.winners.map(id => `<@${id}>`).join(', ')}! Je hebt **${gw.prize}** gewonnen.`);
        else await channel.send(`Niemand deed mee aan de giveaway voor **${gw.prize}**.`);
    } catch (err) {}
    const guild = client.guilds.cache.first();
    if (guild) await sendLog(guild, CONFIG.GIVEAWAY_LOG_ID, {
        title: 'Giveaway afgelopen',
        description: `**Prijs:** ${gw.prize}\n**Winnaar(s):** ${gw.winners.length > 0 ? gw.winners.map(id => `<@${id}>`).join(', ') : '_Geen deelnemers_'}\n**Deelnemers:** ${gw.participants.length}`,
        color: PURPLE.dark
    });
}
async function handleGiveawayButton(interaction) {
    const customId = interaction.customId;
    if (customId.startsWith('gw_join_')) {
        const messageId = customId.replace('gw_join_', '');
        const gw = giveaways[messageId];
        if (!gw) return interaction.reply({ content: 'Deze giveaway bestaat niet meer.', flags: MessageFlags.Ephemeral });
        if (gw.ended) return interaction.reply({ content: 'Deze giveaway is al afgelopen.', flags: MessageFlags.Ephemeral });
        if (gw.participants.includes(interaction.user.id)) return interaction.reply({ content: 'Je doet al mee.', flags: MessageFlags.Ephemeral });
        gw.participants.push(interaction.user.id);
        await saveToGist();
        try {
            const channel = await client.channels.fetch(gw.channelId);
            const msg = await channel.messages.fetch(messageId);
            await msg.edit({ embeds: [buildGiveawayEmbed(gw)], components: buildGiveawayRows(messageId, false) });
        } catch (err) {}
        return interaction.reply({ content: 'Je doet mee!', flags: MessageFlags.Ephemeral });
    }
    if (customId.startsWith('gw_reroll_')) {
        const messageId = customId.replace('gw_reroll_', '');
        const gw = giveaways[messageId];
        if (!gw) return interaction.reply({ content: 'Deze giveaway bestaat niet meer.', flags: MessageFlags.Ephemeral });
        if (!isGiveawayManager(interaction)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
        if (!gw.winners || gw.winners.length === 0) return interaction.reply({ content: 'Nog geen winnaar.', flags: MessageFlags.Ephemeral });
        const select = new StringSelectMenuBuilder().setCustomId(`gw_reroll_old_${messageId}`).setPlaceholder('Kies de oude winnaar').addOptions(gw.winners.map(id => ({ label: `Winnaar: ${id}`, value: id })));
        return interaction.reply({ content: 'Kies de oude winnaar:', components: [new ActionRowBuilder().addComponents(select)], flags: MessageFlags.Ephemeral });
    }
}

// --- BACKUP ---
function generateBackupId() { return crypto.randomBytes(4).toString('hex').toUpperCase(); }

async function createBackup(guild, user) {
    const backupId = generateBackupId();
    const roles = guild.roles.cache.filter(r => r.id !== guild.id && !r.managed).map(r => ({ id: r.id, name: r.name, color: r.color, hoist: r.hoist, mentionable: r.mentionable, position: r.position, permissions: r.permissions.bitfield.toString() })).sort((a, b) => a.position - b.position);
    const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).map(c => ({ id: c.id, name: c.name, position: c.position, permissionOverwrites: c.permissionOverwrites.cache.map(o => ({ id: o.id, type: o.type, allow: o.allow.bitfield.toString(), deny: o.deny.bitfield.toString() })) })).sort((a, b) => a.position - b.position);
    const channels = guild.channels.cache.filter(c => c.type !== ChannelType.GuildCategory).map(c => ({ id: c.id, name: c.name, type: c.type, position: c.position, parentId: c.parentId || null, topic: c.topic || null, nsfw: c.nsfw || false, rateLimitPerUser: c.rateLimitPerUser || 0, bitrate: c.bitrate || null, userLimit: c.userLimit || null, permissionOverwrites: c.permissionOverwrites.cache.map(o => ({ id: o.id, type: o.type, allow: o.allow.bitfield.toString(), deny: o.deny.bitfield.toString() })) })).sort((a, b) => a.position - b.position);

    backups[backupId] = {
        id: backupId, guildId: guild.id, guildName: guild.name, createdAt: Date.now(), createdBy: user.id,
        settings: { name: guild.name, verificationLevel: guild.verificationLevel, explicitContentFilter: guild.explicitContentFilter, defaultMessageNotifications: guild.defaultMessageNotifications, afkTimeout: guild.afkTimeout },
        roles, categories, channels,
        botConfig: {
            WELCOME_CHANNEL_ID: CONFIG.WELCOME_CHANNEL_ID, VERIFY_CHANNEL_ID: CONFIG.VERIFY_CHANNEL_ID, VERIFY_ROLE_ID: CONFIG.VERIFY_ROLE_ID,
            SNAP_CHANNEL_ID: CONFIG.SNAP_CHANNEL_ID, SNAP_ROLE_ID: CONFIG.SNAP_ROLE_ID, HONEYPOT_CHANNEL_ID: CONFIG.HONEYPOT_CHANNEL_ID,
            HONEYPOT_LOG_ID: CONFIG.HONEYPOT_LOG_ID, CALL_CHANNEL_ID: CONFIG.CALL_CHANNEL_ID, CALL_CATEGORY_ID: CONFIG.CALL_CATEGORY_ID,
            VERIFY_LOG_ID: CONFIG.VERIFY_LOG_ID, SNAP_LOG_ID: CONFIG.SNAP_LOG_ID, CALL_LOG_ID: CONFIG.CALL_LOG_ID,
            JOIN_LEAVE_LOG_ID: CONFIG.JOIN_LEAVE_LOG_ID, MEMBERS_LIST_CHANNEL_ID: CONFIG.MEMBERS_LIST_CHANNEL_ID,
            CUSTOM_ROLE_PANEL_CHANNEL_ID: CONFIG.CUSTOM_ROLE_PANEL_CHANNEL_ID, CUSTOM_ROLE_MANAGER_ROLE_ID: CONFIG.CUSTOM_ROLE_MANAGER_ROLE_ID,
            GIVEAWAY_CHANNEL_ID: CONFIG.GIVEAWAY_CHANNEL_ID, GIVEAWAY_LOG_ID: CONFIG.GIVEAWAY_LOG_ID, ROLE_MANAGER_LOG_ID: CONFIG.ROLE_MANAGER_LOG_ID,
            COUNTING_CHANNEL_ID: CONFIG.COUNTING_CHANNEL_ID, CASINO_CHANNEL_ID: CONFIG.CASINO_CHANNEL_ID, CASINO_LEADERBOARD_CHANNEL_ID: CONFIG.CASINO_LEADERBOARD_CHANNEL_ID
        },
        customRoles: JSON.parse(JSON.stringify(customRoles))
    };
    await saveToGist();
    return backupId;
}

async function loadBackup(guild, backupId) {
    const backup = backups[backupId];
    if (!backup) throw new Error('Backup niet gevonden.');
    const result = { rolesCreated: 0, rolesUpdated: 0, categoriesCreated: 0, channelsCreated: 0, channelsUpdated: 0, errors: [] };
    const roleIdMap = new Map();
    for (const r of [...backup.roles].sort((a, b) => a.position - b.position)) {
        try {
            const existing = guild.roles.cache.get(r.id) || guild.roles.cache.find(x => x.name === r.name);
            if (existing) { await existing.edit({ name: r.name, color: r.color, hoist: r.hoist, mentionable: r.mentionable, permissions: BigInt(r.permissions) }).catch(err => result.errors.push(`Rol ${r.name}: ${err.message}`)); roleIdMap.set(r.id, existing.id); result.rolesUpdated++; }
            else { const nr = await guild.roles.create({ name: r.name, color: r.color, hoist: r.hoist, mentionable: r.mentionable, permissions: BigInt(r.permissions), reason: 'Backup' }); roleIdMap.set(r.id, nr.id); result.rolesCreated++; }
        } catch (err) { result.errors.push(`Rol ${r.name}: ${err.message}`); }
    }
    const categoryIdMap = new Map();
    for (const c of [...backup.categories].sort((a, b) => a.position - b.position)) {
        try {
            const overwrites = c.permissionOverwrites.map(o => ({ id: o.type === OverwriteType.Role ? (roleIdMap.get(o.id) || o.id) : o.id, type: o.type, allow: BigInt(o.allow), deny: BigInt(o.deny) }));
            const existing = guild.channels.cache.get(c.id) || guild.channels.cache.find(x => x.name === c.name && x.type === ChannelType.GuildCategory);
            if (existing) { await existing.edit({ name: c.name, permissionOverwrites: overwrites }).catch(err => result.errors.push(`Cat ${c.name}: ${err.message}`)); categoryIdMap.set(c.id, existing.id); }
            else { const nc = await guild.channels.create({ name: c.name, type: ChannelType.GuildCategory, permissionOverwrites: overwrites, reason: 'Backup' }); categoryIdMap.set(c.id, nc.id); result.categoriesCreated++; }
        } catch (err) { result.errors.push(`Cat ${c.name}: ${err.message}`); }
    }
    const channelIdMap = new Map();
    for (const c of [...backup.channels].sort((a, b) => a.position - b.position)) {
        try {
            const overwrites = c.permissionOverwrites.map(o => ({ id: o.type === OverwriteType.Role ? (roleIdMap.get(o.id) || o.id) : o.id, type: o.type, allow: BigInt(o.allow), deny: BigInt(o.deny) }));
            const parentId = c.parentId ? (categoryIdMap.get(c.parentId) || c.parentId) : null;
            const existing = guild.channels.cache.get(c.id) || guild.channels.cache.find(x => x.name === c.name && x.type === c.type);
            if (existing) { await existing.edit({ name: c.name, parent: parentId, topic: c.topic || undefined, nsfw: c.nsfw, rateLimitPerUser: c.rateLimitPerUser, permissionOverwrites: overwrites }).catch(err => result.errors.push(`Kanaal ${c.name}: ${err.message}`)); channelIdMap.set(c.id, existing.id); result.channelsUpdated++; }
            else { const nc = await guild.channels.create({ name: c.name, type: c.type, parent: parentId, topic: c.topic || undefined, nsfw: c.nsfw, rateLimitPerUser: c.rateLimitPerUser, bitrate: c.bitrate || undefined, userLimit: c.userLimit || undefined, permissionOverwrites: overwrites, reason: 'Backup' }); channelIdMap.set(c.id, nc.id); result.channelsCreated++; }
        } catch (err) { result.errors.push(`Kanaal ${c.name}: ${err.message}`); }
    }
    if (backup.botConfig) {
        for (const key of Object.keys(backup.botConfig)) {
            const old = backup.botConfig[key];
            if (!old) continue;
            CONFIG[key] = roleIdMap.get(old) || channelIdMap.get(old) || old;
        }
    }
    if (Array.isArray(backup.customRoles)) customRoles = backup.customRoles.map((c, i) => ({ ...c, roleId: roleIdMap.get(c.roleId) || c.roleId, order: i }));
    await saveToGist();
    return result;
}

// --- CALL PANEL ---
function buildCallPanel() {
    const embed = new EmbedBuilder().setTitle('🔊 Calls').setDescription('Maak een call aan met de knop hieronder.\n\n**Openbaar** — iedereen met verify kan joinen.\n**Privé** — alleen jij kan mensen toelaten.\n\n**Kantoor** — stuur je eigen call-paneel opnieuw om mensen toe te voegen of te verwijderen.').setColor(PURPLE.main).setThumbnail(CONFIG.LOGO_URL);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('call_open_public').setLabel('Openbaar').setEmoji('🔊').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('call_open_private').setLabel('Privé').setEmoji('🔒').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('call_office_panel').setLabel('Kantoor').setEmoji('📋').setStyle(ButtonStyle.Secondary)
    );
    return { embeds: [embed], components: [row] };
}

async function setupCallCategory(guild) {
    try {
        const category = guild.channels.cache.get(CONFIG.CALL_CATEGORY_ID);
        if (!category) return;
        await category.permissionOverwrites.set([
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: CONFIG.VERIFY_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel] }
        ]);
    } catch (err) {}
}

function buildCallInfoMessage(channelId, ownerId, isPrivate) {
    const allowed = callAllowed.get(channelId) || new Set();
    let allowedList = '_Niemand anders heeft toegang._';
    if (allowed.size > 1) allowedList = Array.from(allowed).filter(id => id !== ownerId).map(id => `<@${id}>`).join('\n');
    const embed = new EmbedBuilder().setTitle(isPrivate ? '🔒 Privé call aangemaakt' : '🔊 Openbare call aangemaakt').setDescription(`**Eigenaar:** <@${ownerId}>\n**Type:** ${isPrivate ? 'Privé' : 'Openbaar'}\n**Kanaal:** <#${channelId}>\n\n**Toegang:**\n${allowedList}\n\n${isPrivate ? 'Alleen jij kan mensen toelaten of verwijderen.' : 'Iedereen met verify kan joinen.'}`).setColor(PURPLE.main).setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL });
    const rows = [];
    if (isPrivate) rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`call_allow_${channelId}`).setLabel('Iemand toelaten').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`call_remove_${channelId}`).setLabel('Iemand verwijderen').setEmoji('➖').setStyle(ButtonStyle.Secondary)
    ));
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`call_hide_${channelId}`).setLabel('Verberg dit bericht').setEmoji('🙈').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`call_delete_${channelId}`).setLabel('Verwijder call').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
    ));
    return { embeds: [embed], components: rows };
}

function buildCallControlMessage(channelId, ownerId, isPrivate) {
    const embed = new EmbedBuilder().setTitle(isPrivate ? '🔒 Privé call' : '🔊 Openbare call').setDescription(`**Eigenaar:** <@${ownerId}>\n**Type:** ${isPrivate ? 'Privé' : 'Openbaar'}\n\n${isPrivate ? 'Alleen de eigenaar kan mensen toelaten of verwijderen.' : 'Iedereen met verify kan joinen.'}`).setColor(PURPLE.main).setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL });
    const rows = [];
    if (isPrivate) rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`call_allow_${channelId}`).setLabel('Iemand toelaten').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`call_remove_${channelId}`).setLabel('Iemand verwijderen').setEmoji('➖').setStyle(ButtonStyle.Secondary)
    ));
    rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`call_delete_${channelId}`).setLabel('Verwijder call').setEmoji('🗑️').setStyle(ButtonStyle.Danger)));
    return { embeds: [embed], components: rows };
}

async function updateCallControlMessage(channelId, ownerId, isPrivate) {
    try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) return;
        const controlId = callInfoMessages.get(channelId);
        if (!controlId) return;
        const msg = await channel.messages.fetch(controlId).catch(() => null);
        if (!msg) return;
        await msg.edit(buildCallControlMessage(channelId, ownerId, isPrivate)).catch(() => {});
    } catch (err) {}
}

async function createCall(interaction, name, isPrivate) {
    const guild = interaction.guild;
    const member = interaction.member;
    const prefix = isPrivate ? '🔒︱' : '🔊︱';
    const channelName = `${prefix}${toFont(name)}`;
    const overwrites = [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: CONFIG.VERIFY_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel], deny: isPrivate ? [PermissionFlagsBits.Connect] : [] },
        { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers] },
        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers] }
    ];
    const channel = await guild.channels.create({ name: channelName, type: ChannelType.GuildVoice, parent: CONFIG.CALL_CATEGORY_ID, permissionOverwrites: overwrites, reason: `Call van ${member.user.tag}` });
    activeCalls.set(channel.id, { ownerId: member.id, isPrivate, guildId: guild.id, emptySince: Date.now() });
    callAllowed.set(channel.id, new Set([member.id]));
    const controlMsg = await channel.send(buildCallControlMessage(channel.id, member.id, isPrivate)).catch(() => null);
    if (controlMsg) callInfoMessages.set(channel.id, controlMsg.id);
    await interaction.editReply(buildCallInfoMessage(channel.id, member.id, isPrivate)).catch(() => {});
    await sendLog(guild, CONFIG.CALL_LOG_ID, {
        title: isPrivate ? '🔒 Privé call gemaakt' : '🔊 Openbare call gemaakt',
        description: `**Eigenaar:** ${member.user.tag} (\`${member.id}\`)\n**Kanaal:** <#${channel.id}>`,
        color: PURPLE.main, thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
    });
}

// --- BOT ONLINE ---
client.once('ready', async () => {
    console.log(`Ingelogd als ${client.user.tag}`);
    await initGist().catch(err => console.error('Gist init fout:', err.message));

    const guild = client.guilds.cache.first();
    if (guild) { updateStatus(guild); await setupCallCategory(guild).catch(() => {}); }

    try {
        const commands = [
            new SlashCommandBuilder().setName('clear').setDescription('Verwijder berichten').addIntegerOption(o => o.setName('amount').setDescription('1-100').setRequired(true).setMinValue(1).setMaxValue(100)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            new SlashCommandBuilder().setName('antinuke').setDescription('Anti-nuke aan/uit').addStringOption(o => o.setName('actie').setDescription('enable of disable').setRequired(true).addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' })),
            new SlashCommandBuilder().setName('refresh').setDescription('Werk ledenlijst en panel bij'),
            new SlashCommandBuilder().setName('customroles').setDescription('Vernieuw custom role panel'),
            new SlashCommandBuilder().setName('createbackup').setDescription('Maak backup'),
            new SlashCommandBuilder().setName('loadbackup').setDescription('Laad backup').addStringOption(o => o.setName('id').setDescription('Backup ID').setRequired(true)),
            new SlashCommandBuilder().setName('giveaway').setDescription('Start giveaway').addStringOption(o => o.setName('prijs').setDescription('Prijs').setRequired(true)).addStringOption(o => o.setName('duur').setDescription('10s, 1u, 1d, 2d').setRequired(true)).addIntegerOption(o => o.setName('winnaars').setDescription('Aantal').setRequired(false).setMinValue(1).setMaxValue(10)),
            new SlashCommandBuilder().setName('resetgame').setDescription('Reset een spel').addStringOption(o => o.setName('game').setDescription('Welk spel?').setRequired(true).addChoices({ name: 'Tel Spel', value: 'counting' })),
            new SlashCommandBuilder().setName('blackjack').setDescription('Speel blackjack').addIntegerOption(o => o.setName('inzet').setDescription('Chips').setRequired(true).setMinValue(1).setMaxValue(10000)),
            new SlashCommandBuilder().setName('roulette').setDescription('Speel roulette').addIntegerOption(o => o.setName('inzet').setDescription('Chips').setRequired(true).setMinValue(1).setMaxValue(10000)).addStringOption(o => o.setName('kleur').setDescription('rood, zwart of groen').setRequired(true).addChoices({ name: 'rood', value: 'rood' }, { name: 'zwart', value: 'zwart' }, { name: 'groen', value: 'groen' })),
            new SlashCommandBuilder().setName('crasher').setDescription('Speel crasher').addIntegerOption(o => o.setName('inzet').setDescription('Chips').setRequired(true).setMinValue(1).setMaxValue(10000)).addNumberOption(o => o.setName('auto_cashout').setDescription('Optioneel: cash out op deze multiplier (1.1 - 25)').setRequired(false).setMinValue(1.1).setMaxValue(25)),
            new SlashCommandBuilder().setName('chips').setDescription('Bekijk je chips'),
            new SlashCommandBuilder().setName('givechips').setDescription('Geef chips aan een gebruiker').addUserOption(o => o.setName('user').setDescription('Ontvanger').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Aantal chips').setRequired(true).setMinValue(1).setMaxValue(1000000))
        ].map(c => c.toJSON());

        console.log(`Aantal commands: ${commands.length}`);
        console.log('Command namen:', commands.map(c => c.name).join(', '));
        await client.application.commands.set(commands);
        console.log('Slash commands geregistreerd');
    } catch (err) { console.error('Fout bij registreren commands:', err); }

    try {
        const verifyChannel = await client.channels.fetch(CONFIG.VERIFY_CHANNEL_ID);
        if (verifyChannel) {
            await cleanupOldPanels(verifyChannel, 'Welkom bij Familie Snus');
            const verifyCount = await countRoleMembers(verifyChannel.guild, CONFIG.VERIFY_ROLE_ID, true);
            const embed = new EmbedBuilder().setTitle('Familie Snus Verification').setDescription('Welkom bij Familie Snus!\n\nKlik op de knop hieronder om jezelf te verifiëren.').setColor(PURPLE.main).setThumbnail(CONFIG.LOGO_URL);
            const button = new ButtonBuilder().setCustomId(CONFIG.VERIFY_BUTTON_ID).setLabel(`${verifyCount}`).setEmoji('✅').setStyle(ButtonStyle.Success);
            await verifyChannel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
        }
    } catch (err) { console.error('Verify panel fout:', err.message); }

    try {
        await new Promise(r => setTimeout(r, 3000));
        const snapChannel = await client.channels.fetch(CONFIG.SNAP_CHANNEL_ID);
        if (snapChannel) {
            await cleanupOldPanels(snapChannel, 'Snapchat Ping');
            const snapCount = await countRoleMembers(snapChannel.guild, CONFIG.SNAP_ROLE_ID, false);
            const embed = new EmbedBuilder().setTitle('Snapchat Ping').setDescription('Klik op de knop hieronder om de **Snapchat Ping** rol te krijgen.\n\nJe krijgt dan een ping wanneer er snaps gedropped worden.').setColor(PURPLE.main).setThumbnail(CONFIG.LOGO_URL);
            const button = new ButtonBuilder().setCustomId(CONFIG.SNAP_BUTTON_ID).setLabel(`${snapCount}`).setEmoji('👻').setStyle(ButtonStyle.Primary);
            await snapChannel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
        }
    } catch (err) { console.error('Snap panel fout:', err.message); }

    try {
        const honeyChannel = await client.channels.fetch(CONFIG.HONEYPOT_CHANNEL_ID);
        if (honeyChannel) { await clearChannel(honeyChannel); await honeyChannel.send({ embeds: [buildHoneypotEmbed()] }); }
    } catch (err) { console.error('Honeypot fout:', err.message); }

    try {
        const callChannel = await client.channels.fetch(CONFIG.CALL_CHANNEL_ID);
        if (callChannel) { await cleanupOldPanels(callChannel, 'Maak een call aan'); await callChannel.send(buildCallPanel()); }
    } catch (err) { console.error('Call panel fout:', err.message); }

    try {
        const state = countingState[CONFIG.COUNTING_CHANNEL_ID] || { current: 0, lastUserId: null, highScore: 0, lastMessageId: null };
        if (!state.highScore) state.highScore = 0;
        countingState[CONFIG.COUNTING_CHANNEL_ID] = state;
        await resetCountingChannel(state);
    } catch (err) { console.error('Counting fout:', err.message); }

    try { await updateCasinoPanel(); } catch (err) {}
    try { await updateCasinoLeaderboard(); } catch (err) {}
    try { await updateMembersList(); } catch (err) {}
    try { await updateCustomRolePanel(); } catch (err) {}

    for (const [id, gw] of Object.entries(giveaways)) if (!gw.ended) startGiveawayTimer(id);

    setInterval(checkEmptyCalls, CONFIG.EMPTY_CALL_CHECK_MS);
    console.log('Bot is klaar.');
});

// --- MEMBER EVENTS ---
client.on('guildMemberAdd', async (member) => {
    updateStatus(member.guild); scheduleMembersUpdate();
    joinTimes[member.id] = Date.now(); await saveToGist();
    try {
        const channel = member.guild.channels.cache.get(CONFIG.WELCOME_CHANNEL_ID);
        if (channel) {
            const embed = new EmbedBuilder().setDescription(`Welkom ${member}!\nJe bent lid **${member.guild.memberCount}** van **${CONFIG.SERVER_NAME}**.`).setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 })).setColor(PURPLE.main).setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL });
            await channel.send({ embeds: [embed] }).catch(() => {});
        }
    } catch (err) {}
    try {
        const dmEmbed = new EmbedBuilder().setTitle(`Welkom bij ${CONFIG.SERVER_NAME}!`).setDescription(`Hey ${member.user.username}!\n\nLeuk dat je er bent. Verifieer jezelf in <#${CONFIG.VERIFY_CHANNEL_ID}>.`).setColor(PURPLE.main).setThumbnail(CONFIG.LOGO_URL);
        await member.send({ embeds: [dmEmbed] });
    } catch (err) {}
    await sendLog(member.guild, CONFIG.JOIN_LEAVE_LOG_ID, {
        title: '📥 Lid gejoint',
        description: `**Gebruiker:** ${member.user.tag} (\`${member.id}\`)\n**Account aangemaakt:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n**Leden nu:** ${member.guild.memberCount}`,
        color: PURPLE.main, thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
    });
});

client.on('guildMemberRemove', async (member) => {
    updateStatus(member.guild); scheduleMembersUpdate();
    const joinedAt = joinTimes[member.id];
    let durationText = 'Onbekend';
    if (joinedAt) { durationText = formatDuration(Date.now() - joinedAt); delete joinTimes[member.id]; await saveToGist(); }
    const hadVerify = member.roles.cache.has(CONFIG.VERIFY_ROLE_ID);
    const hadSnap = member.roles.cache.has(CONFIG.SNAP_ROLE_ID);
    await sendLog(member.guild, CONFIG.JOIN_LEAVE_LOG_ID, {
        title: '📤 Lid verlaten',
        description: `**Gebruiker:** ${member.user.tag} (\`${member.id}\`)\n**In server voor:** ${durationText}\n**Had verify:** ${hadVerify ? 'ja' : 'nee'}\n**Had snapchat ping:** ${hadSnap ? 'ja' : 'nee'}`,
        color: PURPLE.dark, thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
    });
    if (hadVerify) { roleCountCache.delete(CONFIG.VERIFY_ROLE_ID); await refreshPanel(CONFIG.VERIFY_CHANNEL_ID, CONFIG.VERIFY_BUTTON_ID, '✅', ButtonStyle.Success, CONFIG.VERIFY_ROLE_ID); }
    if (hadSnap) { roleCountCache.delete(CONFIG.SNAP_ROLE_ID); await refreshPanel(CONFIG.SNAP_CHANNEL_ID, CONFIG.SNAP_BUTTON_ID, '👻', ButtonStyle.Primary, CONFIG.SNAP_ROLE_ID); }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const oldVerify = oldMember.roles.cache.has(CONFIG.VERIFY_ROLE_ID);
    const newVerify = newMember.roles.cache.has(CONFIG.VERIFY_ROLE_ID);
    const oldSnap = oldMember.roles.cache.has(CONFIG.SNAP_ROLE_ID);
    const newSnap = newMember.roles.cache.has(CONFIG.SNAP_ROLE_ID);
    let rankChanged = false;
    for (const cr of customRoles) if (oldMember.roles.cache.has(cr.roleId) !== newMember.roles.cache.has(cr.roleId)) { rankChanged = true; break; }
    if (rankChanged) scheduleMembersUpdate();
    if (!oldVerify && newVerify) {
        roleCountCache.delete(CONFIG.VERIFY_ROLE_ID);
        await refreshPanel(CONFIG.VERIFY_CHANNEL_ID, CONFIG.VERIFY_BUTTON_ID, '✅', ButtonStyle.Success, CONFIG.VERIFY_ROLE_ID);
        try { await newMember.send({ embeds: [new EmbedBuilder().setTitle('Je bent geverifieerd!').setDescription(`Bedankt voor het verifiëren bij **${CONFIG.SERVER_NAME}**!\n\nJe hebt nu toegang.`).setColor(PURPLE.main).setThumbnail(CONFIG.LOGO_URL)] }); } catch (err) {}
    } else if (oldVerify && !newVerify) {
        roleCountCache.delete(CONFIG.VERIFY_ROLE_ID);
        await refreshPanel(CONFIG.VERIFY_CHANNEL_ID, CONFIG.VERIFY_BUTTON_ID, '✅', ButtonStyle.Success, CONFIG.VERIFY_ROLE_ID);
    }
    if (!oldSnap && newSnap) { roleCountCache.delete(CONFIG.SNAP_ROLE_ID); await refreshPanel(CONFIG.SNAP_CHANNEL_ID, CONFIG.SNAP_BUTTON_ID, '👻', ButtonStyle.Primary, CONFIG.SNAP_ROLE_ID); }
    else if (oldSnap && !newSnap) { roleCountCache.delete(CONFIG.SNAP_ROLE_ID); await refreshPanel(CONFIG.SNAP_CHANNEL_ID, CONFIG.SNAP_BUTTON_ID, '👻', ButtonStyle.Primary, CONFIG.SNAP_ROLE_ID); }
});

// --- ANTI-NUKE ---
function checkThreshold(userId, type) {
    const key = `${userId}:${type}`;
    const now = Date.now();
    const list = (actionTracker.get(key) || []).filter(t => now - t < CONFIG.ANTINUKE_WINDOW_MS);
    list.push(now);
    actionTracker.set(key, list);
    return list.length >= (CONFIG.ANTINUKE_LIMITS[type] || 999);
}
async function findExecutor(guild, type, targetId) {
    try {
        const logs = await guild.fetchAuditLogs({ type, limit: 5 });
        const entry = logs.entries.find(e => (!targetId || e.target?.id === targetId) && Date.now() - e.createdTimestamp < 15000);
        return entry ? entry.executor : null;
    } catch (err) { return null; }
}
async function punishUser(guild, userId, reason) {
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return;
        const removable = member.roles.cache.filter(r => r.id !== guild.id && guild.members.me.roles.highest.position > r.position);
        if (removable.size > 0) await member.roles.remove(removable, `Anti-nuke: ${reason}`).catch(() => {});
        await member.kick(`Anti-nuke: ${reason}`).catch(() => {});
    } catch (err) {}
}
async function handleNukeAction(guild, type, targetId) {
    if (!antinukeData.enabled) return;
    const executor = await findExecutor(guild, type, targetId);
    if (!executor || executor.id === client.user.id) return;
    if (CONFIG.ANTINUKE_ALLOWED_USERS.includes(executor.id)) return;
    if (checkThreshold(executor.id, type)) await punishUser(guild, executor.id, `Te veel ${type} acties`);
}
client.on('channelDelete', async (channel) => { if (channel.guild) await handleNukeAction(channel.guild, 'channelDelete', channel.id); });
client.on('roleDelete', async (role) => { if (role.guild) await handleNukeAction(role.guild, 'roleDelete', role.id); });
client.on('guildBanAdd', async (ban) => { await handleNukeAction(ban.guild, 'banAdd', ban.user.id); });

// --- MESSAGES ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id === CONFIG.HONEYPOT_CHANNEL_ID) {
        await message.delete().catch(() => {});
        const member = message.member;
        if (!member) return;
        try {
            await member.kick('Honeypot');
            kickData.total += 1;
            await saveToGist();
            await refreshHoneypotEmbed(message.channel);
            await sendLog(message.guild, CONFIG.HONEYPOT_LOG_ID, {
                title: '🍯 Honeypot kick',
                description: `**Gebruiker:** ${message.author.tag} (\`${message.author.id}\`)\n**Actie:** KICK\n**Totaal aantal kicks:** ${kickData.total}`,
                color: PURPLE.dark, thumbnail: message.author.displayAvatarURL({ dynamic: true, size: 128 })
            });
        } catch (err) {}
        return;
    }
    if (message.channel.id === CONFIG.COUNTING_CHANNEL_ID) { await handleCountingMessage(message); return; }
    if (message.guild) {
        const protectedChannels = [CONFIG.HONEYPOT_CHANNEL_ID, CONFIG.HONEYPOT_LOG_ID, CONFIG.VERIFY_LOG_ID, CONFIG.SNAP_LOG_ID, CONFIG.CALL_LOG_ID, CONFIG.JOIN_LEAVE_LOG_ID, CONFIG.MEMBERS_LIST_CHANNEL_ID, CONFIG.CUSTOM_ROLE_PANEL_CHANNEL_ID, CONFIG.GIVEAWAY_CHANNEL_ID, CONFIG.GIVEAWAY_LOG_ID, CONFIG.ROLE_MANAGER_LOG_ID, CONFIG.COUNTING_CHANNEL_ID, CONFIG.CASINO_CHANNEL_ID, CONFIG.CASINO_LEADERBOARD_CHANNEL_ID];
        if (!protectedChannels.includes(message.channel.id)) { const deleted = await handleAntiLink(message); if (deleted) return; }
    }
});

// --- VOICE ---
client.on('voiceStateUpdate', async (oldState, newState) => {
    const channelId = oldState.channelId || newState.channelId;
    if (!channelId || !activeCalls.has(channelId)) return;
    const call = activeCalls.get(channelId);
    if (!call) return;
    const channel = newState.guild.channels.cache.get(channelId) || oldState.guild.channels.cache.get(channelId);
    if (!channel) return;
    if (oldState.channelId === channelId && newState.channelId !== channelId && oldState.id === call.ownerId) {
        await channel.delete('Eigenaar verliet call').catch(() => {});
        activeCalls.delete(channelId); callAllowed.delete(channelId); callInfoMessages.delete(channelId); return;
    }
    const members = channel.members.filter(m => !m.user.bot);
    if (members.size === 0) { if (!call.emptySince) call.emptySince = Date.now(); }
    else call.emptySince = null;
    activeCalls.set(channelId, call);
});

async function checkEmptyCalls() {
    const now = Date.now();
    for (const [channelId, call] of activeCalls.entries()) {
        try {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (!channel) { activeCalls.delete(channelId); callAllowed.delete(channelId); callInfoMessages.delete(channelId); continue; }
            const members = channel.members.filter(m => !m.user.bot);
            if (members.size > 0) { call.emptySince = null; activeCalls.set(channelId, call); continue; }
            if (!call.emptySince) { call.emptySince = now; activeCalls.set(channelId, call); continue; }
            if (now - call.emptySince >= CONFIG.EMPTY_CALL_TIMEOUT_MS) {
                await channel.delete('Leeg').catch(() => {});
                activeCalls.delete(channelId); callAllowed.delete(channelId); callInfoMessages.delete(channelId);
            }
        } catch (err) {}
    }
}

// --- INTERACTIONS ---
client.on('interactionCreate', async (interaction) => {

    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'chips') {
            const u = getCasinoUser(interaction.user.id);
            const embed = new EmbedBuilder().setTitle('🪙 Jouw chips').setDescription(`**Chips:** ${u.chips}\n**Wins:** ${u.wins}\n**Losses:** ${u.losses}\n**Games:** ${u.gamesPlayed}`).setColor(CASINO_GOLD).setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 })).setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (interaction.commandName === 'givechips') {
            if (interaction.user.id !== CONFIG.CHIP_GIVER_ID) {
                return interaction.reply({ content: '❌ Geen toestemming.', flags: MessageFlags.Ephemeral });
            }
            const target = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            if (target.bot) return interaction.reply({ content: '❌ Kan geen chips aan een bot geven.', flags: MessageFlags.Ephemeral });
            const u = getCasinoUser(target.id);
            u.chips += amount;
            await saveToGist();
            await updateCasinoLeaderboard();
            const embed = new EmbedBuilder()
                .setTitle('🪙 Chips gegeven')
                .setDescription(`**Van:** <@${interaction.user.id}>\n**Aan:** <@${target.id}>\n**Bedrag:** +${amount} chips\n**Nieuwe balans van ontvanger:** ${u.chips} chips`)
                .setColor(CASINO_GOLD)
                .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 128 }))
                .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL })
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        }

        if (interaction.commandName === 'blackjack') return playBlackjack(interaction, interaction.options.getInteger('inzet'));
        if (interaction.commandName === 'roulette') return playRoulette(interaction, interaction.options.getInteger('inzet'), interaction.options.getString('kleur'));
        if (interaction.commandName === 'crasher') {
            const bet = interaction.options.getInteger('inzet');
            const auto = interaction.options.getNumber('auto_cashout');
            return playCrasher(interaction, bet, auto === null ? null : auto);
        }

        if (interaction.commandName === 'clear') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
            const amount = interaction.options.getInteger('amount');
            try { await interaction.channel.bulkDelete(amount, true); await interaction.reply({ content: `${amount} verwijderd.`, flags: MessageFlags.Ephemeral }); }
            catch (err) { await interaction.reply({ content: 'Mislukt.', flags: MessageFlags.Ephemeral }); }
        }
        if (interaction.commandName === 'antinuke') {
            if (!CONFIG.ANTINUKE_ALLOWED_USERS.includes(interaction.user.id)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
            const actie = interaction.options.getString('actie');
            if (actie === 'enable') { antinukeData.enabled = true; await saveToGist(); return interaction.reply({ content: 'Anti-nuke **aan**.', flags: MessageFlags.Ephemeral }); }
            if (actie === 'disable') { antinukeData.enabled = false; await saveToGist(); return interaction.reply({ content: 'Anti-nuke **uit**.', flags: MessageFlags.Ephemeral }); }
        }
        if (interaction.commandName === 'refresh') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await updateMembersList(); await updateCustomRolePanel();
            return interaction.editReply({ content: '✅ Bijgewerkt.' });
        }
        if (interaction.commandName === 'customroles') {
            if (!isCustomRoleManager(interaction)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await updateCustomRolePanel();
            return interaction.editReply({ content: '✅ Vernieuwd.' });
        }
        if (interaction.commandName === 'createbackup') {
            if (!isBackupManager(interaction.user.id)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const id = await createBackup(interaction.guild, interaction.user);
            try { await interaction.user.send({ embeds: [new EmbedBuilder().setTitle('✅ Backup').setDescription(`**ID:** \`${id}\``).setColor(PURPLE.main)] }); } catch (err) {}
            return interaction.editReply({ content: '✅ Backup gemaakt. Code in DM.' });
        }
        if (interaction.commandName === 'loadbackup') {
            if (!isBackupManager(interaction.user.id)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
            const id = interaction.options.getString('id').toUpperCase();
            if (!backups[id]) return interaction.reply({ content: 'Niet gevonden.', flags: MessageFlags.Ephemeral });
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const r = await loadBackup(interaction.guild, id);
            return interaction.editReply({ content: `✅ Geladen. Rollen: ${r.rolesCreated}, kanalen: ${r.channelsCreated}.` });
        }
        if (interaction.commandName === 'giveaway') {
            if (!isGiveawayManager(interaction)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
            const durationMs = parseDurationInput(interaction.options.getString('duur'));
            if (!durationMs) return interaction.reply({ content: 'Ongeldige duur.', flags: MessageFlags.Ephemeral });
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const channel = await client.channels.fetch(CONFIG.GIVEAWAY_CHANNEL_ID);
            const data = { channelId: CONFIG.GIVEAWAY_CHANNEL_ID, prize: interaction.options.getString('prijs'), endsAt: Date.now() + durationMs, winnersCount: interaction.options.getInteger('winnaars') || 1, participants: [], winners: [], ended: false, hostId: interaction.user.id };
            const sent = await channel.send({ embeds: [buildGiveawayEmbed(data)] });
            data.messageId = sent.id; giveaways[sent.id] = data;
            await saveToGist();
            await sent.edit({ embeds: [buildGiveawayEmbed(data)], components: buildGiveawayRows(sent.id, false) });
            startGiveawayTimer(sent.id);
            return interaction.editReply({ content: `✅ Giveaway in <#${CONFIG.GIVEAWAY_CHANNEL_ID}>.` });
        }
        if (interaction.commandName === 'resetgame') {
            const game = interaction.options.getString('game');
            if (game === 'counting') {
                if (!isCustomRoleManager(interaction)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const state = countingState[CONFIG.COUNTING_CHANNEL_ID] || { current: 0, lastUserId: null, highScore: 0, lastMessageId: null };
                state.current = 0; state.lastUserId = null;
                countingState[CONFIG.COUNTING_CHANNEL_ID] = state;
                await saveToGist();
                await resetCountingChannel(state);
                return interaction.editReply({ content: '✅ Gereset. Highscore bewaard.' });
            }
            return interaction.reply({ content: 'Onbekend.', flags: MessageFlags.Ephemeral });
        }
        return;
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'call_modal_public' || interaction.customId === 'call_modal_private') {
            const isPrivate = interaction.customId === 'call_modal_private';
            const name = interaction.fields.getTextInputValue('call_name');
            await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
            let active = 0;
            for (const [, c] of activeCalls.entries()) if (c.ownerId === interaction.user.id) active++;
            if (active >= CONFIG.MAX_CALLS_PER_USER) return interaction.editReply({ content: '❌ Je hebt al een actieve call.' });
            try { await createCall(interaction, name, isPrivate); } catch (err) { await interaction.editReply({ content: 'Kon call niet maken.' }).catch(() => {}); }
            return;
        }
        if (interaction.customId === 'cr_modal_add') {
            if (!isCustomRoleManager(interaction)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const raw = interaction.fields.getTextInputValue('cr_name').trim();
            if (!raw) return interaction.editReply({ content: 'Ongeldig.' });
            const fontName = toFont(raw);
            const newRole = await interaction.guild.roles.create({ name: fontName, color: 0x9b59b6, reason: `Custom role door ${interaction.user.tag}` });
            customRoles.push({ name: fontName, roleId: newRole.id, order: customRoles.length });
            await saveToGist();
            await updateCustomRolePanel();
            await updateMembersList();
            return interaction.editReply({ content: `✅ Rol **${fontName}** aangemaakt.` });
        }
        if (interaction.customId.startsWith('cr_modal_rename_')) {
            if (!isCustomRoleManager(interaction)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const roleId = interaction.customId.replace('cr_modal_rename_', '');
            const raw = interaction.fields.getTextInputValue('cr_name').trim();
            const cr = customRoles.find(c => c.roleId === roleId);
            if (!cr) return interaction.editReply({ content: 'Niet gevonden.' });
            const fontName = toFont(raw);
            const role = interaction.guild.roles.cache.get(roleId);
            if (role) await role.setName(fontName).catch(() => {});
            cr.name = fontName;
            await saveToGist();
            await updateCustomRolePanel();
            await updateMembersList();
            return interaction.editReply({ content: `✅ Hernoemd naar **${fontName}**.` });
        }
        return;
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'cr_select_remove') {
            if (!isCustomRoleManager(interaction)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const roleId = interaction.values[0];
            const idx = customRoles.findIndex(c => c.roleId === roleId);
            if (idx === -1) return interaction.editReply({ content: 'Niet gevonden.' });
            const role = interaction.guild.roles.cache.get(roleId);
            if (role) await role.delete().catch(() => {});
            customRoles.splice(idx, 1);
            customRoles.forEach((c, i) => c.order = i);
            await saveToGist();
            await updateCustomRolePanel();
            await updateMembersList();
            return interaction.editReply({ content: '✅ Verwijderd.' });
        }
        if (interaction.customId === 'cr_select_rename') {
            if (!isCustomRoleManager(interaction)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
            const roleId = interaction.values[0];
            const cr = customRoles.find(c => c.roleId === roleId);
            if (!cr) return interaction.reply({ content: 'Niet gevonden.', flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder().setCustomId(`cr_modal_rename_${roleId}`).setTitle('Hernoemen');
            const input = new TextInputBuilder().setCustomId('cr_name').setLabel('Nieuwe naam').setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true).setValue(cr.name);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }
        if (interaction.customId === 'cr_select_move') {
            if (!isCustomRoleManager(interaction)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const [roleId, dir] = interaction.values[0].split(':');
            const idx = customRoles.findIndex(c => c.roleId === roleId);
            if (idx === -1) return interaction.editReply({ content: 'Niet gevonden.' });
            const target = dir === 'up' ? idx - 1 : idx + 1;
            if (target < 0 || target >= customRoles.length) return interaction.editReply({ content: 'Kan niet.' });
            [customRoles[idx], customRoles[target]] = [customRoles[target], customRoles[idx]];
            customRoles.forEach((c, i) => c.order = i);
            await saveToGist();
            await updateCustomRolePanel();
            await updateMembersList();
            return interaction.editReply({ content: '✅ Aangepast.' });
        }
        if (interaction.customId.startsWith('gw_reroll_old_')) {
            if (!isGiveawayManager(interaction)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
            const messageId = interaction.customId.replace('gw_reroll_old_', '');
            const gw = giveaways[messageId];
            if (!gw) return interaction.reply({ content: 'Bestaat niet meer.', flags: MessageFlags.Ephemeral });
            const oldWinner = interaction.values[0];
            const eligible = gw.participants.filter(id => !gw.winners.includes(id) && id !== oldWinner);
            if (eligible.length === 0) return interaction.reply({ content: 'Geen andere deelnemers.', flags: MessageFlags.Ephemeral });
            const select = new StringSelectMenuBuilder().setCustomId(`gw_reroll_new_${messageId}_${oldWinner}`).setPlaceholder('Nieuwe winnaar').addOptions(eligible.slice(0, 25).map(id => ({ label: `Deelnemer ${id}`, value: id })));
            return interaction.update({ content: `Oude winnaar: <@${oldWinner}>. Kies nieuwe:`, components: [new ActionRowBuilder().addComponents(select)] });
        }
        if (interaction.customId.startsWith('gw_reroll_new_')) {
            if (!isGiveawayManager(interaction)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
            const parts = interaction.customId.replace('gw_reroll_new_', '').split('_');
            const oldWinner = parts.pop();
            const messageId = parts.join('_');
            const gw = giveaways[messageId];
            if (!gw) return interaction.reply({ content: 'Bestaat niet meer.', flags: MessageFlags.Ephemeral });
            const newWinner = interaction.values[0];
            const idx = gw.winners.indexOf(oldWinner);
            if (idx === -1) return interaction.reply({ content: 'Ongeldig.', flags: MessageFlags.Ephemeral });
            gw.winners[idx] = newWinner;
            await saveToGist();
            try {
                const channel = await client.channels.fetch(gw.channelId);
                const msg = await channel.messages.fetch(messageId);
                await msg.edit({ embeds: [buildGiveawayEmbed(gw)], components: buildGiveawayRows(messageId, true) });
                await channel.send(`🔁 Nieuwe winnaar: <@${newWinner}>!`);
            } catch (err) {}
            return interaction.update({ content: `✅ Nieuwe winnaar: <@${newWinner}>.`, components: [] });
        }
        if (interaction.customId.startsWith('call_allow_select_')) {
            const channelId = interaction.customId.replace('call_allow_select_', '');
            const call = activeCalls.get(channelId);
            if (!call || interaction.user.id !== call.ownerId) return interaction.reply({ content: 'Niet toegestaan.', flags: MessageFlags.Ephemeral });
            const userId = interaction.values[0];
            try {
                const channel = await client.channels.fetch(channelId);
                await channel.permissionOverwrites.edit(userId, { ViewChannel: true, Connect: true });
                if (!callAllowed.has(channelId)) callAllowed.set(channelId, new Set());
                callAllowed.get(channelId).add(userId);
                await updateCallControlMessage(channelId, call.ownerId, call.isPrivate);
                await interaction.reply({ content: `<@${userId}> toegelaten.`, flags: MessageFlags.Ephemeral });
            } catch (err) { await interaction.reply({ content: 'Mislukt.', flags: MessageFlags.Ephemeral }); }
            return;
        }
        if (interaction.customId.startsWith('call_remove_select_')) {
            const channelId = interaction.customId.replace('call_remove_select_', '');
            const call = activeCalls.get(channelId);
            if (!call || interaction.user.id !== call.ownerId) return interaction.reply({ content: 'Niet toegestaan.', flags: MessageFlags.Ephemeral });
            const userId = interaction.values[0];
            if (userId === call.ownerId) return interaction.reply({ content: 'Kan jezelf niet verwijderen.', flags: MessageFlags.Ephemeral });
            try {
                const channel = await client.channels.fetch(channelId);
                await channel.permissionOverwrites.delete(userId).catch(() => {});
                const allowed = callAllowed.get(channelId);
                if (allowed) allowed.delete(userId);
                const vm = channel.members.get(userId);
                if (vm) await vm.voice.disconnect('Verwijderd').catch(() => {});
                await updateCallControlMessage(channelId, call.ownerId, call.isPrivate);
                await interaction.reply({ content: `<@${userId}> verwijderd.`, flags: MessageFlags.Ephemeral });
            } catch (err) { await interaction.reply({ content: 'Mislukt.', flags: MessageFlags.Ephemeral }); }
            return;
        }
        return;
    }

    if (!interaction.isButton()) return;

    if (interaction.customId === 'casino_reset') {
        const u = getCasinoUser(interaction.user.id);
        if (u.chips > 0) return interaction.reply({ content: 'Je hebt nog chips.', flags: MessageFlags.Ephemeral });
        resetCasinoUser(interaction.user.id);
        await saveToGist();
        return interaction.update({ content: '✅ Je chips zijn gereset naar **100**.', components: [] });
    }

    if (interaction.customId.startsWith('bj_hit_')) return handleBjHit(interaction, interaction.customId.replace('bj_hit_', ''));
    if (interaction.customId.startsWith('bj_stand_')) return handleBjStand(interaction, interaction.customId.replace('bj_stand_', ''));
    if (interaction.customId.startsWith('crash_cashout_')) return handleCrashCashout(interaction, interaction.customId.replace('crash_cashout_', ''));

    if (interaction.customId.startsWith('gw_join_') || (interaction.customId.startsWith('gw_reroll_') && !interaction.customId.startsWith('gw_reroll_old_') && !interaction.customId.startsWith('gw_reroll_new_'))) return handleGiveawayButton(interaction);

    if (interaction.customId === 'cr_add') {
        if (!isCustomRoleManager(interaction)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
        const modal = new ModalBuilder().setCustomId('cr_modal_add').setTitle('Rol toevoegen');
        const input = new TextInputBuilder().setCustomId('cr_name').setLabel('Naam (zonder font)').setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
    }
    if (interaction.customId === 'cr_remove') {
        if (!isCustomRoleManager(interaction)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
        if (customRoles.length === 0) return interaction.reply({ content: 'Geen rollen.', flags: MessageFlags.Ephemeral });
        const select = new StringSelectMenuBuilder().setCustomId('cr_select_remove').setPlaceholder('Kies').addOptions(customRoles.map(c => ({ label: c.name, value: c.roleId })));
        return interaction.reply({ content: 'Kies:', components: [new ActionRowBuilder().addComponents(select)], flags: MessageFlags.Ephemeral });
    }
    if (interaction.customId === 'cr_rename') {
        if (!isCustomRoleManager(interaction)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
        if (customRoles.length === 0) return interaction.reply({ content: 'Geen rollen.', flags: MessageFlags.Ephemeral });
        const select = new StringSelectMenuBuilder().setCustomId('cr_select_rename').setPlaceholder('Kies').addOptions(customRoles.map(c => ({ label: c.name, value: c.roleId })));
        return interaction.reply({ content: 'Kies:', components: [new ActionRowBuilder().addComponents(select)], flags: MessageFlags.Ephemeral });
    }
    if (interaction.customId === 'cr_up' || interaction.customId === 'cr_down') {
        if (!isCustomRoleManager(interaction)) return interaction.reply({ content: 'Geen toestemming.', flags: MessageFlags.Ephemeral });
        if (customRoles.length < 2) return interaction.reply({ content: 'Min 2 rollen.', flags: MessageFlags.Ephemeral });
        const dir = interaction.customId === 'cr_up' ? 'up' : 'down';
        const opts = [];
        for (let i = 0; i < customRoles.length; i++) {
            if (dir === 'up' && i === 0) continue;
            if (dir === 'down' && i === customRoles.length - 1) continue;
            opts.push({ label: customRoles[i].name, value: `${customRoles[i].roleId}:${dir}` });
        }
        if (opts.length === 0) return interaction.reply({ content: 'Niks te verplaatsen.', flags: MessageFlags.Ephemeral });
        const select = new StringSelectMenuBuilder().setCustomId('cr_select_move').setPlaceholder('Kies').addOptions(opts);
        return interaction.reply({ content: 'Kies:', components: [new ActionRowBuilder().addComponents(select)], flags: MessageFlags.Ephemeral });
    }

    if (interaction.customId === 'call_open_public' || interaction.customId === 'call_open_private') {
        const isPrivate = interaction.customId === 'call_open_private';
        const modal = new ModalBuilder().setCustomId(isPrivate ? 'call_modal_private' : 'call_modal_public').setTitle(isPrivate ? 'Privé call' : 'Openbare call');
        const input = new TextInputBuilder().setCustomId('call_name').setLabel('Naam').setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
    }
    if (interaction.customId === 'call_office_panel') {
        const mine = [];
        for (const [cid, call] of activeCalls.entries()) if (call.ownerId === interaction.user.id) mine.push({ cid, ...call });
        if (mine.length === 0) return interaction.reply({ content: 'Geen actieve call.', flags: MessageFlags.Ephemeral });
        for (let i = 0; i < mine.length; i++) {
            const c = mine[i];
            const payload = buildCallInfoMessage(c.cid, c.ownerId, c.isPrivate);
            if (i === 0) await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
            else await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
        }
        return;
    }
    if (interaction.customId.startsWith('call_allow_') && !interaction.customId.startsWith('call_allow_select_')) {
        const cid = interaction.customId.replace('call_allow_', '');
        const call = activeCalls.get(cid);
        if (!call || interaction.user.id !== call.ownerId) return interaction.reply({ content: 'Niet toegestaan.', flags: MessageFlags.Ephemeral });
        const row = new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId(`call_allow_select_${cid}`).setPlaceholder('Kies').setMinValues(1).setMaxValues(1));
        return interaction.reply({ content: 'Kies:', components: [row], flags: MessageFlags.Ephemeral });
    }
    if (interaction.customId.startsWith('call_remove_') && !interaction.customId.startsWith('call_remove_select_')) {
        const cid = interaction.customId.replace('call_remove_', '');
        const call = activeCalls.get(cid);
        if (!call || interaction.user.id !== call.ownerId) return interaction.reply({ content: 'Niet toegestaan.', flags: MessageFlags.Ephemeral });
        const row = new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId(`call_remove_select_${cid}`).setPlaceholder('Kies').setMinValues(1).setMaxValues(1));
        return interaction.reply({ content: 'Kies:', components: [row], flags: MessageFlags.Ephemeral });
    }
    if (interaction.customId.startsWith('call_hide_')) {
        try { await interaction.update({ content: '🙈 Verborgen.', embeds: [], components: [] }); } catch (e) {}
        return;
    }
    if (interaction.customId.startsWith('call_delete_')) {
        const cid = interaction.customId.replace('call_delete_', '');
        const call = activeCalls.get(cid);
        if (!call || interaction.user.id !== call.ownerId) return interaction.reply({ content: 'Niet toegestaan.', flags: MessageFlags.Ephemeral });
        const channel = await client.channels.fetch(cid).catch(() => null);
        if (channel) await channel.delete().catch(() => {});
        activeCalls.delete(cid); callAllowed.delete(cid); callInfoMessages.delete(cid);
        try { await interaction.update({ content: '🗑️ Verwijderd.', embeds: [], components: [] }); } catch (e) {}
        return;
    }

    if (interaction.customId === CONFIG.VERIFY_BUTTON_ID) {
        try {
            const role = interaction.guild.roles.cache.get(CONFIG.VERIFY_ROLE_ID);
            if (!role) return interaction.reply({ content: 'Rol niet gevonden.', flags: MessageFlags.Ephemeral });
            if (interaction.member.roles.cache.has(CONFIG.VERIFY_ROLE_ID)) return interaction.reply({ content: 'Al geverifieerd.', flags: MessageFlags.Ephemeral });
            await interaction.member.roles.add(role);
            const count = await countRoleMembers(interaction.guild, CONFIG.VERIFY_ROLE_ID, true);
            const newRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(CONFIG.VERIFY_BUTTON_ID).setLabel(`${count}`).setEmoji('✅').setStyle(ButtonStyle.Success));
            await interaction.message.edit({ components: [newRow] }).catch(() => {});
            return interaction.reply({ content: 'Geverifieerd!', flags: MessageFlags.Ephemeral });
        } catch (err) { if (!interaction.replied) await interaction.reply({ content: 'Fout.', flags: MessageFlags.Ephemeral }).catch(() => {}); }
        return;
    }
    if (interaction.customId === CONFIG.SNAP_BUTTON_ID) {
        try {
            const role = interaction.guild.roles.cache.get(CONFIG.SNAP_ROLE_ID);
            if (!role) return interaction.reply({ content: 'Rol niet gevonden.', flags: MessageFlags.Ephemeral });
            if (interaction.member.roles.cache.has(CONFIG.SNAP_ROLE_ID)) return interaction.reply({ content: 'Al gekoppeld.', flags: MessageFlags.Ephemeral });
            await interaction.member.roles.add(role);
            const count = await countRoleMembers(interaction.guild, CONFIG.SNAP_ROLE_ID, true);
            const newRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(CONFIG.SNAP_BUTTON_ID).setLabel(`${count}`).setEmoji('👻').setStyle(ButtonStyle.Primary));
            await interaction.message.edit({ components: [newRow] }).catch(() => {});
            return interaction.reply({ content: 'Rol gekregen.', flags: MessageFlags.Ephemeral });
        } catch (err) { if (!interaction.replied) await interaction.reply({ content: 'Fout.', flags: MessageFlags.Ephemeral }).catch(() => {}); }
    }
});

client.on('error', (err) => console.error('Client error:', err));
client.login(CONFIG.TOKEN);
