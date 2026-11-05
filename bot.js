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
    AuditLogEvent,
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

const PURPLE = {
    main: '#9b59b6',
    dark: '#7d3c98',
    light: '#bb8fce',
    accent: '#a569bd',
    soft: '#d2b4de'
};

const CASINO_GREEN = '#2ecc71';
const CASINO_RED = '#e74c3c';
const CASINO_GOLD = '#f1c40f';

const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GIST_ID: process.env.GIST_ID || '',
    SERVER_NAME: 'Familie Snus',
    LOGO_URL: 'https://cdn.discordapp.com/attachments/1567554042039771136/1567660546663383102/40134efe-7805-4254-90b6-79de4620ed6a.png?ex=6aecfd28&is=6aebaba8&hm=80fdcf3fc87f2b51afda037cb67f29aeaf84de04cda3b25c52d8a44e9f9ee6c6&',

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

    COUNTING_CHANNEL_ID: '1567857095989264485',

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

    ANTINUKE_ALLOWED_USERS: [
        '1033753872927293520',
        '1559586201348866050'
    ],
    ANTINUKE_LIMITS: {
        channelDelete: 3,
        roleDelete: 3,
        banAdd: 3,
        kickAdd: 3,
        memberRoleUpdate: 10
    },
    ANTINUKE_WINDOW_MS: 10000
};

const FIXED_RANKS = [
    { name: '𝐅𝐚𝐦𝐢𝐥𝐢𝐞 𝐒𝐧𝐮𝐬 𝐊𝐨𝐧𝐢𝐧𝐠', roleId: '1567226745143300106', level: 100 },
    { name: '𝐅𝐚𝐦𝐢𝐥𝐢𝐞 𝐒𝐧𝐮𝐬 𝐎𝐩𝐩𝐞𝐫𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐚𝐧𝐭', roleId: '1567241269082726450', level: 90 },
    { name: '𝐅𝐚𝐦𝐢𝐥𝐢𝐞 𝐒𝐧𝐮𝐬 𝐃𝐢𝐜𝐭𝐚𝐭𝐨𝐫', roleId: '1567245029255413890', level: 80 },
    { name: '𝐅𝐚𝐦𝐢𝐥𝐢𝐞 𝐒𝐧𝐮𝐬 𝐋𝐮𝐢𝐭𝐞𝐧𝐚𝐧𝐭', roleId: '1567264503744299109', level: 70 },
    { name: '𝐅𝐚𝐦𝐢𝐥𝐢𝐞 𝐒𝐧𝐮𝐬 𝐆𝐞𝐧𝐞𝐫𝐚𝐥', roleId: '1567246499069566987', level: 60 },
    { name: '𝐅𝐚𝐦𝐢𝐥𝐢𝐞 𝐒𝐧𝐮𝐬 𝐌𝐚𝐧𝐚𝐠𝐞𝐫', roleId: '1567643616745230459', level: 50 }
];

const DEFAULT_CUSTOM_ROLES = [
    { name: '𝐅𝐚𝐦𝐢𝐥𝐢𝐞 𝐒𝐧𝐮𝐬 𝐊𝐨𝐧𝐢𝐧𝐠', roleId: '1567226745143300106' },
    { name: '𝐅𝐚𝐦𝐢𝐥𝐢𝐞 𝐒𝐧𝐮𝐬 𝐎𝐩𝐩𝐞𝐫𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐚𝐧𝐭', roleId: '1567241269082726450' },
    { name: '𝐅𝐚𝐦𝐢𝐥𝐢𝐞 𝐒𝐧𝐮𝐬 𝐃𝐢𝐜𝐭𝐚𝐭𝐨𝐫', roleId: '1567245029255413890' },
    { name: '𝐅𝐚𝐦𝐢𝐥𝐢𝐞 𝐒𝐧𝐮𝐬 𝐋𝐮𝐢𝐭𝐞𝐧𝐚𝐧𝐭', roleId: '1567264503744299109' },
    { name: '𝐅𝐚𝐦𝐢𝐥𝐢𝐞 𝐒𝐧𝐮𝐬 𝐆𝐞𝐧𝐞𝐫𝐚𝐥', roleId: '1567246499069566987' },
    { name: '𝐅𝐚𝐦𝐢𝐥𝐢𝐞 𝐒𝐧𝐮𝐬 𝐌𝐚𝐧𝐚𝐠𝐞𝐫', roleId: '1567643616745230459' }
];

let customRoles = [];
let giveaways = {};
let countingState = {};
let casino = {}; // userId -> { chips, wins, losses, gamesPlayed }
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
    if (!CONFIG.GITHUB_TOKEN) {
        console.log('Geen GITHUB_TOKEN ingesteld, database uitgeschakeld.');
        return;
    }
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
                            kicks: { total: 0 },
                            antinuke: { enabled: true },
                            joinTimes: {},
                            customRoles: DEFAULT_CUSTOM_ROLES.map((r, i) => ({ ...r, order: i })),
                            backups: {},
                            giveaways: {},
                            countingState: {},
                            casino: {}
                        }, null, 2)
                    }
                }
            });
            gistId = gist.id;
            gistReady = true;
            console.log('========================================');
            console.log(`NIEUWE GIST AANGEMAAKT: ${gistId}`);
            console.log(`Zet GIST_ID=${gistId} in Render Environment`);
            console.log('========================================');
        }
        await loadFromGist();
    } catch (err) {
        console.error('Fout bij initialiseren gist:', err.message);
    }
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
    } catch (err) {
        console.error('Fout bij laden database:', err.message);
    }
    await migrateDefaultCustomRoles();
    console.log(`Database geladen: kicks=${kickData.total}, antinuke=${antinukeData.enabled}, customRoles=${customRoles.length}, giveaways=${Object.keys(giveaways).length}, casino=${Object.keys(casino).length}`);
}

async function migrateDefaultCustomRoles() {
    for (const cr of customRoles) {
        if (cr.name && cr.name.startsWith('𝐒𝐧𝐮𝐬')) {
            cr.name = cr.name.replace(/^𝐒𝐧𝐮𝐬/, '𝐅𝐚𝐦𝐢𝐥𝐢𝐞 𝐒𝐧𝐮𝐬');
        } else if (cr.name && cr.name.startsWith('𝐙𝐨𝐞𝐭')) {
            cr.name = cr.name.replace(/^𝐙𝐨𝐞𝐭/, '𝐅𝐚𝐦𝐢𝐥𝐢𝐞 𝐒𝐧𝐮𝐬');
        }
    }

    let changed = false;
    const existingIds = new Set(customRoles.map(c => c.roleId));
    for (const def of DEFAULT_CUSTOM_ROLES) {
        if (!existingIds.has(def.roleId)) {
            customRoles.push({
                name: def.name,
                roleId: def.roleId,
                order: customRoles.length
            });
            changed = true;
        }
    }
    if (changed) {
        customRoles.forEach((c, i) => c.order = i);
    }
    await saveToGist();
}

async function saveToGist() {
    if (!gistReady || !gistId) return;
    try {
        await gistRequest('PATCH', `/gists/${gistId}`, {
            files: {
                [GIST_FILE]: {
                    content: JSON.stringify({
                        kicks: kickData,
                        antinuke: antinukeData,
                        joinTimes,
                        customRoles,
                        backups,
                        giveaways,
                        countingState,
                        casino
                    }, null, 2)
                }
            }
        });
    } catch (err) {
        console.error('Fout bij opslaan database:', err.message);
    }
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
function toFont(text) {
    return text.split('').map(ch => FONT_MAP[ch] || ch).join('');
}

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
    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        u: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000
    };
    if (!multipliers[unit]) return null;
    return value * multipliers[unit];
}

// --- CASINO HELPERS ---
function getCasinoUser(userId) {
    if (!casino[userId]) {
        casino[userId] = { chips: 100, wins: 0, losses: 0, gamesPlayed: 0 };
    }
    return casino[userId];
}

function updateCasinoUser(userId, updates) {
    const user = getCasinoUser(userId);
    Object.assign(user, updates);
    casino[userId] = user;
    return user;
}

// --- CASINO EMBEDS ---
function buildCasinoPanelEmbed() {
    return new EmbedBuilder()
        .setTitle('🎰 Familie Snus Casino')
        .setDescription(
            '**Welkom in het casino!**\n\n' +
            'Iedereen begint met **100 chips**.\n\n' +
            '**Games:**\n' +
            '• `/blackjack <inzet>` — speel blackjack tegen de dealer\n' +
            '• `/roulette <inzet> <kleur>` — kies rood, zwart of groen\n\n' +
            '**Beloningen:**\n' +
            '• Blackjack winst: **2x** je inzet\n' +
            '• Roulette rood/zwart: **2x** je inzet\n' +
            '• Roulette groen: **14x** je inzet\n\n' +
            '💡 **Tip:** Je kan je chips altijd zien met `/chips`.'
        )
        .setColor(CASINO_GOLD)
        .setThumbnail(CONFIG.LOGO_URL)
        .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL })
        .setTimestamp();
}

function buildCasinoLeaderboardEmbed() {
    const entries = Object.entries(casino)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.chips - a.chips)
        .slice(0, 10);

    let body = '';
    if (entries.length === 0) {
        body = '_Nog geen spelers._';
    } else {
        const medals = ['🥇', '🥈', '🥉'];
        entries.forEach((entry, index) => {
            const medal = medals[index] || `**${index + 1}.**`;
            body += `${medal} <@${entry.id}> — **${entry.chips} chips** `;
            body += `(${entry.wins}W / ${entry.losses}L)\n`;
        });
    }

    return new EmbedBuilder()
        .setTitle('🏆 Casino Leaderboard — Top 10')
        .setDescription(`**Rijkste spelers van Familie Snus:**\n\n${body}`)
        .setColor(CASINO_GOLD)
        .setThumbnail(CONFIG.LOGO_URL)
        .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL })
        .setTimestamp();
}

async function updateCasinoLeaderboard() {
    try {
        const channel = await client.channels.fetch(CONFIG.CASINO_LEADERBOARD_CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isTextBased()) {
            console.log('Casino leaderboard kanaal niet gevonden');
            return;
        }

        const payload = { embeds: [buildCasinoLeaderboardEmbed()] };

        if (casinoLeaderboardMessageId) {
            try {
                const existing = await channel.messages.fetch(casinoLeaderboardMessageId);
                await existing.edit(payload);
                return;
            } catch (err) {
                casinoLeaderboardMessageId = null;
            }
        }

        try {
            const fetched = await channel.messages.fetch({ limit: 20 });
            const botMessages = fetched.filter(m => m.author.id === client.user.id);
            for (const m of botMessages.values()) {
                await m.delete().catch(() => {});
            }
        } catch (err) {}

        const sent = await channel.send(payload);
        casinoLeaderboardMessageId = sent.id;
    } catch (err) {
        console.error('Fout bij updaten casino leaderboard:', err);
    }
}

async function updateCasinoPanel() {
    try {
        const channel = await client.channels.fetch(CONFIG.CASINO_CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isTextBased()) {
            console.log('Casino kanaal niet gevonden');
            return;
        }

        const payload = { embeds: [buildCasinoPanelEmbed()] };

        if (casinoPanelMessageId) {
            try {
                const existing = await channel.messages.fetch(casinoPanelMessageId);
                await existing.edit(payload);
                return;
            } catch (err) {
                casinoPanelMessageId = null;
            }
        }

        try {
            const fetched = await channel.messages.fetch({ limit: 20 });
            const botMessages = fetched.filter(m => m.author.id === client.user.id);
            for (const m of botMessages.values()) {
                await m.delete().catch(() => {});
            }
        } catch (err) {}

        const sent = await channel.send(payload);
        casinoPanelMessageId = sent.id;
    } catch (err) {
        console.error('Fout bij updaten casino panel:', err);
    }
}

// --- CASINO GAMES ---
async function playBlackjack(interaction, bet) {
    const user = getCasinoUser(interaction.user.id);

    if (bet < 1) {
        return interaction.reply({ content: '❌ Je moet minstens **1 chip** inzetten.', flags: MessageFlags.Ephemeral });
    }
    if (bet > user.chips) {
        return interaction.reply({ content: `❌ Je hebt maar **${user.chips} chips**.`, flags: MessageFlags.Ephemeral });
    }

    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    const drawCard = () => ({
        suit: suits[Math.floor(Math.random() * suits.length)],
        rank: ranks[Math.floor(Math.random() * ranks.length)]
    });

    const cardValue = (card) => {
        if (card.rank === 'A') return 11;
        if (['J', 'Q', 'K'].includes(card.rank)) return 10;
        return parseInt(card.rank, 10);
    };

    const handValue = (hand) => {
        let total = 0;
        let aces = 0;
        for (const card of hand) {
            total += cardValue(card);
            if (card.rank === 'A') aces++;
        }
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        return total;
    };

    const formatHand = (hand) => hand.map(c => `${c.rank}${c.suit}`).join(' ');

    const playerHand = [drawCard(), drawCard()];
    const dealerHand = [drawCard(), drawCard()];

    const playerTotal = handValue(playerHand);
    const dealerTotal = handValue(dealerHand);

    const playerBlackjack = playerTotal === 21;
    const dealerBlackjack = dealerTotal === 21;

    let result = '';
    let winnings = 0;
    let color = PURPLE.main;

    if (playerBlackjack && dealerBlackjack) {
        result = '🤝 Gelijkspel! Jullie hebben allebei blackjack.';
        winnings = 0;
        color = CASINO_GOLD;
    } else if (playerBlackjack) {
        result = '🎉 **BLACKJACK!** Je wint 2x je inzet!';
        winnings = bet * 2;
        color = CASINO_GREEN;
    } else if (dealerBlackjack) {
        result = '💀 De dealer heeft blackjack. Je verliest je inzet.';
        winnings = -bet;
        color = CASINO_RED;
    } else {
        // Simpele dealer AI: trek tot 17
        while (handValue(dealerHand) < 17) {
            dealerHand.push(drawCard());
        }

        const finalPlayer = handValue(playerHand);
        const finalDealer = handValue(dealerHand);

        if (finalPlayer > 21) {
            result = `💥 Je bust met **${finalPlayer}**. Je verliest je inzet.`;
            winnings = -bet;
            color = CASINO_RED;
        } else if (finalDealer > 21) {
            result = `🎉 De dealer bust met **${finalDealer}**! Je wint 2x je inzet!`;
            winnings = bet;
            color = CASINO_GREEN;
        } else if (finalPlayer > finalDealer) {
            result = `🎉 Je wint! **${finalPlayer}** tegen **${finalDealer}**. Je wint 2x je inzet!`;
            winnings = bet;
            color = CASINO_GREEN;
        } else if (finalPlayer < finalDealer) {
            result = `💀 Je verliest. **${finalPlayer}** tegen **${finalDealer}**.`;
            winnings = -bet;
            color = CASINO_RED;
        } else {
            result = `🤝 Gelijkspel! **${finalPlayer}** tegen **${finalDealer}**.`;
            winnings = 0;
            color = CASINO_GOLD;
        }
    }

    const newChips = Math.max(0, user.chips + winnings);
    updateCasinoUser(interaction.user.id, {
        chips: newChips,
        wins: user.wins + (winnings > 0 ? 1 : 0),
        losses: user.losses + (winnings < 0 ? 1 : 0),
        gamesPlayed: user.gamesPlayed + 1
    });
    await saveToGist();

    const embed = new EmbedBuilder()
        .setTitle('🃏 Blackjack')
        .setDescription(
            `**Jouw hand:** ${formatHand(playerHand)} (**${playerTotal}**)\n` +
            `**Dealer:** ${formatHand(dealerHand)} (**${dealerTotal}**)\n\n` +
            `${result}\n\n` +
            `**Inzet:** ${bet} chips\n` +
            `**Nieuwe balans:** ${newChips} chips`
        )
        .setColor(color)
        .setThumbnail(CONFIG.LOGO_URL)
        .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await updateCasinoLeaderboard();
    await updateCasinoPanel();
}

async function playRoulette(interaction, bet, choice) {
    const user = getCasinoUser(interaction.user.id);

    if (bet < 1) {
        return interaction.reply({ content: '❌ Je moet minstens **1 chip** inzetten.', flags: MessageFlags.Ephemeral });
    }
    if (bet > user.chips) {
        return interaction.reply({ content: `❌ Je hebt maar **${user.chips} chips**.`, flags: MessageFlags.Ephemeral });
    }

    const validChoices = ['rood', 'zwart', 'groen'];
    const normalized = choice.toLowerCase();
    if (!validChoices.includes(normalized)) {
        return interaction.reply({ content: '❌ Kies **rood**, **zwart** of **groen**.', flags: MessageFlags.Ephemeral });
    }

    // Roulette: 0 (groen) + 1-36
    const number = Math.floor(Math.random() * 37);
    const isGreen = number === 0;

    // Rood/zwart verdeling (Europees roulette)
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const isRed = !isGreen && redNumbers.includes(number);
    const isBlack = !isGreen && !isRed;

    let result = '';
    let winnings = 0;
    let color = PURPLE.main;

    if (isGreen) {
        result = `🟢 **${number} GROEN!**`;
        color = CASINO_GREEN;
        if (normalized === 'groen') {
            winnings = bet * 14;
            result += ` Je wint **14x** je inzet!`;
        } else {
            winnings = -bet;
            result += ' Je verliest je inzet.';
            color = CASINO_RED;
        }
    } else if (isRed) {
        result = `🔴 **${number} ROOD!**`;
        color = CASINO_RED;
        if (normalized === 'rood') {
            winnings = bet;
            result += ' Je wint **2x** je inzet!';
            color = CASINO_GREEN;
        } else {
            winnings = -bet;
            result += ' Je verliest je inzet.';
        }
    } else {
        result = `⚫ **${number} ZWART!**`;
        color = '#2b2b2b';
        if (normalized === 'zwart') {
            winnings = bet;
            result += ' Je wint **2x** je inzet!';
            color = CASINO_GREEN;
        } else {
            winnings = -bet;
            result += ' Je verliest je inzet.';
            color = CASINO_RED;
        }
    }

    const newChips = Math.max(0, user.chips + winnings);
    updateCasinoUser(interaction.user.id, {
        chips: newChips,
        wins: user.wins + (winnings > 0 ? 1 : 0),
        losses: user.losses + (winnings < 0 ? 1 : 0),
        gamesPlayed: user.gamesPlayed + 1
    });
    await saveToGist();

    const embed = new EmbedBuilder()
        .setTitle('🎡 Roulette')
        .setDescription(
            `${result}\n\n` +
            `**Jouw keuze:** ${normalized}\n` +
            `**Inzet:** ${bet} chips\n` +
            `**Nieuwe balans:** ${newChips} chips`
        )
        .setColor(color)
        .setThumbnail(CONFIG.LOGO_URL)
        .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await updateCasinoLeaderboard();
    await updateCasinoPanel();
}

// --- CALL PANEL ---
function buildCallPanel() {
    const embed = new EmbedBuilder()
        .setTitle('🔊 Calls')
        .setDescription(
            'Maak een call aan met de knop hieronder.\n\n' +
            '**Openbaar** — iedereen met verify kan joinen.\n' +
            '**Privé** — alleen jij kan mensen toelaten.\n\n' +
            '**Kantoor** — stuur je eigen call-paneel opnieuw om mensen toe te voegen of te verwijderen.'
        )
        .setColor(PURPLE.main)
        .setThumbnail(CONFIG.LOGO_URL);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('call_open_public')
            .setLabel('Openbaar')
            .setEmoji('🔊')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('call_open_private')
            .setLabel('Privé')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('call_office_panel')
            .setLabel('Kantoor')
            .setEmoji('📋')
            .setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
}

async function setupCallCategory(guild) {
    try {
        const category = guild.channels.cache.get(CONFIG.CALL_CATEGORY_ID);
        if (!category) {
            console.log('Call categorie niet gevonden');
            return;
        }
        await category.permissionOverwrites.set([
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: CONFIG.VERIFY_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel] }
        ]);
        console.log('Call categorie rechten ingesteld');
    } catch (err) {
        console.error('Fout bij instellen call categorie:', err);
    }
}

function buildCallInfoMessage(channelId, ownerId, isPrivate) {
    const allowed = callAllowed.get(channelId) || new Set();

    let allowedList = '_Niemand anders heeft toegang._';
    if (allowed.size > 1) {
        allowedList = Array.from(allowed)
            .filter(id => id !== ownerId)
            .map(id => `<@${id}>`)
            .join('\n');
    }

    const embed = new EmbedBuilder()
        .setTitle(isPrivate ? '🔒 Privé call aangemaakt' : '🔊 Openbare call aangemaakt')
        .setDescription(
            `**Eigenaar:** <@${ownerId}>\n` +
            `**Type:** ${isPrivate ? 'Privé' : 'Openbaar'}\n` +
            `**Kanaal:** <#${channelId}>\n\n` +
            `**Toegang:**\n${allowedList}\n\n` +
            (isPrivate
                ? 'Alleen jij kan mensen toelaten of verwijderen.'
                : 'Iedereen met verify kan joinen.')
        )
        .setColor(PURPLE.main)
        .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL });

    const rows = [];

    if (isPrivate) {
        rows.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`call_allow_${channelId}`)
                    .setLabel('Iemand toelaten')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`call_remove_${channelId}`)
                    .setLabel('Iemand verwijderen')
                    .setEmoji('➖')
                    .setStyle(ButtonStyle.Secondary)
            )
        );
    }

    rows.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`call_hide_${channelId}`)
                .setLabel('Verberg dit bericht')
                .setEmoji('🙈')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`call_delete_${channelId}`)
                .setLabel('Verwijder call')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger)
        )
    );

    return { embeds: [embed], components: rows };
}

function buildCallControlMessage(channelId, ownerId, isPrivate) {
    const embed = new EmbedBuilder()
        .setTitle(isPrivate ? '🔒 Privé call' : '🔊 Openbare call')
        .setDescription(
            `**Eigenaar:** <@${ownerId}>\n` +
            `**Type:** ${isPrivate ? 'Privé' : 'Openbaar'}\n\n` +
            (isPrivate
                ? 'Alleen de eigenaar kan mensen toelaten of verwijderen via de knoppen hieronder.'
                : 'Iedereen met verify kan joinen.')
        )
        .setColor(PURPLE.main)
        .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL });

    const rows = [];

    if (isPrivate) {
        rows.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`call_allow_${channelId}`)
                    .setLabel('Iemand toelaten')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`call_remove_${channelId}`)
                    .setLabel('Iemand verwijderen')
                    .setEmoji('➖')
                    .setStyle(ButtonStyle.Secondary)
            )
        );
    }

    rows.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`call_delete_${channelId}`)
                .setLabel('Verwijder call')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger)
        )
    );

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

        const payload = buildCallControlMessage(channelId, ownerId, isPrivate);
        await msg.edit(payload).catch(() => {});
    } catch (err) {
        console.error('Fout bij updaten call control message:', err);
    }
}

async function createCall(interaction, name, isPrivate) {
    const guild = interaction.guild;
    const member = interaction.member;
    const prefix = isPrivate ? '🔒︱' : '🔊︱';
    const channelName = `${prefix}${toFont(name)}`;

    const overwrites = [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
            id: CONFIG.VERIFY_ROLE_ID,
            allow: [PermissionFlagsBits.ViewChannel],
            deny: isPrivate ? [PermissionFlagsBits.Connect] : []
        },
        {
            id: member.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.MoveMembers
            ]
        },
        {
            id: client.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.MoveMembers
            ]
        }
    ];

    const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: CONFIG.CALL_CATEGORY_ID,
        permissionOverwrites: overwrites,
        reason: `Call van ${member.user.tag}`
    });

    activeCalls.set(channel.id, {
        ownerId: member.id,
        isPrivate,
        guildId: guild.id,
        emptySince: Date.now()
    });
    callAllowed.set(channel.id, new Set([member.id]));

    const controlMsg = await channel.send(buildCallControlMessage(channel.id, member.id, isPrivate)).catch(() => null);
    if (controlMsg) {
        callInfoMessages.set(channel.id, controlMsg.id);
    }

    const payload = buildCallInfoMessage(channel.id, member.id, isPrivate);
    await interaction.editReply(payload).catch(() => {});

    await sendLog(guild, CONFIG.CALL_LOG_ID, {
        title: isPrivate ? '🔒 Privé call gemaakt' : '🔊 Openbare call gemaakt',
        description: `**Eigenaar:** ${member.user.tag} (\`${member.id}\`)\n**Kanaal:** <#${channel.id}>`,
        color: PURPLE.main,
        thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
    });
}

// --- BOT ONLINE ---
client.once('clientReady', async () => {
    console.log(`Ingelogd als ${client.user.tag}`);

    await initGist();

    const guild = client.guilds.cache.first();
    if (guild) {
        updateStatus(guild);
        await setupCallCategory(guild);
    }

    try {
        const commands = [
            new SlashCommandBuilder()
                .setName('clear')
                .setDescription('Verwijder een aantal berichten in dit kanaal')
                .addIntegerOption(opt =>
                    opt.setName('amount')
                        .setDescription('Aantal berichten (1-100)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            new SlashCommandBuilder()
                .setName('antinuke')
                .setDescription('Zet het anti-nuke systeem aan of uit')
                .addStringOption(opt =>
                    opt.setName('actie')
                        .setDescription('enable of disable')
                        .setRequired(true)
                        .addChoices(
                            { name: 'enable', value: 'enable' },
                            { name: 'disable', value: 'disable' }
                        )
                ),
            new SlashCommandBuilder()
                .setName('refresh')
                .setDescription('Werk de ledenlijst en het custom role panel bij'),
            new SlashCommandBuilder()
                .setName('customroles')
                .setDescription('Vernieuw het custom role panel'),
            new SlashCommandBuilder()
                .setName('createbackup')
                .setDescription('Maak een backup van de server (alleen voor toegestane users)'),
            new SlashCommandBuilder()
                .setName('loadbackup')
                .setDescription('Laad een backup (alleen voor toegestane users)')
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('Backup ID')
                        .setRequired(true)
                ),
            new SlashCommandBuilder()
                .setName('giveaway')
                .setDescription('Start een giveaway (alleen voor giveaway managers)')
                .addStringOption(opt =>
                    opt.setName('prijs')
                        .setDescription('Wat is de prijs?')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('duur')
                        .setDescription('Duur: bijv. 10s, 1u, 1d, 2d')
                        .setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt.setName('winnaars')
                        .setDescription('Aantal winnaars (standaard 1)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10)
                ),
            new SlashCommandBuilder()
                .setName('resetgame')
                .setDescription('Reset de huidige stand van een spel (highscore blijft bewaard)')
                .addStringOption(opt =>
                    opt.setName('game')
                        .setDescription('Welk spel wil je resetten?')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Tel Spel', value: 'counting' }
                        )
                ),
            new SlashCommandBuilder()
                .setName('blackjack')
                .setDescription('Speel blackjack in het casino')
                .addIntegerOption(opt =>
                    opt.setName('inzet')
                        .setDescription('Hoeveel chips zet je in?')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10000)
                ),
            new SlashCommandBuilder()
                .setName('roulette')
                .setDescription('Speel roulette in het casino')
                .addIntegerOption(opt =>
                    opt.setName('inzet')
                        .setDescription('Hoeveel chips zet je in?')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10000)
                )
                .addStringOption(opt =>
                    opt.setName('kleur')
                        .setDescription('Kies rood, zwart of groen')
                        .setRequired(true)
                        .addChoices(
                            { name: 'rood', value: 'rood' },
                            { name: 'zwart', value: 'zwart' },
                            { name: 'groen', value: 'groen' }
                        )
                ),
            new SlashCommandBuilder()
                .setName('chips')
                .setDescription('Bekijk hoeveel chips je hebt')
        ].map(c => c.toJSON());
        await client.application.commands.set(commands);
        console.log('Slash commands geregistreerd');
    } catch (err) {
        console.error('Fout bij registreren commands:', err);
    }

    // Verify panel
    try {
        const verifyChannel = await client.channels.fetch(CONFIG.VERIFY_CHANNEL_ID);
        if (verifyChannel) {
            await cleanupOldPanels(verifyChannel, 'Welkom bij Familie Snus');
            const verifyCount = await countRoleMembers(verifyChannel.guild, CONFIG.VERIFY_ROLE_ID, true);
            const embed = new EmbedBuilder()
                .setTitle('Familie Snus Verification')
                .setDescription('Welkom bij Familie Snus!\n\nKlik op de knop hieronder om jezelf te verifiëren en toegang te krijgen tot de server.')
                .setColor(PURPLE.main)
                .setThumbnail(CONFIG.LOGO_URL);
            const button = new ButtonBuilder()
                .setCustomId(CONFIG.VERIFY_BUTTON_ID)
                .setLabel(`${verifyCount}`)
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success);
            const row = new ActionRowBuilder().addComponents(button);
            await verifyChannel.send({ embeds: [embed], components: [row] });
        }
    } catch (err) {
        console.error('Fout bij verify panel:', err);
    }

    await new Promise(r => setTimeout(r, 5000));

    // Snapchat panel
    try {
        const snapChannel = await client.channels.fetch(CONFIG.SNAP_CHANNEL_ID);
        if (snapChannel) {
            await cleanupOldPanels(snapChannel, 'Snapchat Ping');
            const snapCount = await countRoleMembers(snapChannel.guild, CONFIG.SNAP_ROLE_ID, false);
            const embed = new EmbedBuilder()
                .setTitle('Snapchat Ping')
                .setDescription(
                    'Klik op de knop hieronder om de **Snapchat Ping** rol te krijgen.\n\n' +
                    'Je krijgt dan een ping wanneer er snaps gedropped worden.'
                )
                .setColor(PURPLE.main)
                .setThumbnail(CONFIG.LOGO_URL);
            const button = new ButtonBuilder()
                .setCustomId(CONFIG.SNAP_BUTTON_ID)
                .setLabel(`${snapCount}`)
                .setEmoji('👻')
                .setStyle(ButtonStyle.Primary);
            const row = new ActionRowBuilder().addComponents(button);
            await snapChannel.send({ embeds: [embed], components: [row] });
        }
    } catch (err) {
        console.error('Fout bij snapchat panel:', err);
    }

    // Honeypot
    try {
        const honeyChannel = await client.channels.fetch(CONFIG.HONEYPOT_CHANNEL_ID);
        if (honeyChannel) {
            await clearChannel(honeyChannel);
            await honeyChannel.send({ embeds: [buildHoneypotEmbed()] });
        }
    } catch (err) {
        console.error('Fout bij honeypot panel:', err);
    }

    // Call panel
    try {
        const callChannel = await client.channels.fetch(CONFIG.CALL_CHANNEL_ID);
        if (callChannel) {
            await cleanupOldPanels(callChannel, 'Maak een call aan');
            await callChannel.send(buildCallPanel());
        }
    } catch (err) {
        console.error('Fout bij call panel:', err);
    }

    // Counting game paneel
    try {
        const countingChannel = await client.channels.fetch(CONFIG.COUNTING_CHANNEL_ID);
        if (countingChannel) {
            const state = countingState[countingChannel.id] || { current: 0, lastUserId: null, highScore: 0, lastMessageId: null };
            if (!state.highScore) state.highScore = 0;
            countingState[countingChannel.id] = state;

            const payload = {
                embeds: [new EmbedBuilder()
                    .setTitle('🔢 Tel-spel')
                    .setDescription(
                        `**Huidige stand:** ${state.current}\n` +
                        `**Highscore:** ${state.highScore}\n\n` +
                        '**Regels:**\n' +
                        '• Typ het juiste volgende getal.\n' +
                        '• Je mag niet 2x achter elkaar typen.\n' +
                        '• Typ je iets anders of fout, dan begint het spel opnieuw bij 1.'
                    )
                    .setColor(PURPLE.main)
                    .setThumbnail(CONFIG.LOGO_URL)
                    .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL })
                    .setTimestamp()]
            };

            const sent = await countingChannel.send(payload);
            state.lastMessageId = sent.id;
            countingState[countingChannel.id] = state;
        }
    } catch (err) {
        console.error('Fout bij tel-spel paneel:', err);
    }

    // Casino panel + leaderboard
    await updateCasinoPanel();
    await updateCasinoLeaderboard();

    await updateMembersList();
    await updateCustomRolePanel();

    for (const [id, gw] of Object.entries(giveaways)) {
        if (!gw.ended) startGiveawayTimer(id);
    }

    setInterval(checkEmptyCalls, CONFIG.EMPTY_CALL_CHECK_MS);
    console.log(`Lege-call checker gestart (elke ${CONFIG.EMPTY_CALL_CHECK_MS / 60000} min, timeout ${CONFIG.EMPTY_CALL_TIMEOUT_MS / 60000} min)`);
});

// --- WELCOME + DM + JOIN LOG ---
client.on('guildMemberAdd', async (member) => {
    updateStatus(member.guild);
    scheduleMembersUpdate();

    joinTimes[member.id] = Date.now();
    await saveToGist();

    try {
        const channel = member.guild.channels.cache.get(CONFIG.WELCOME_CHANNEL_ID);
        if (channel) {
            const memberCount = member.guild.memberCount;
            const embed = new EmbedBuilder()
                .setDescription(
                    `Welkom ${member}!\n` +
                    `Je bent lid **${memberCount}** van **${CONFIG.SERVER_NAME}**.`
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .setColor(PURPLE.main)
                .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL });
            await channel.send({ embeds: [embed] }).catch(() => {});
        }
    } catch (err) {
        console.error('Fout bij welcome:', err);
    }

    try {
        const dmEmbed = new EmbedBuilder()
            .setTitle(`Welkom bij ${CONFIG.SERVER_NAME}!`)
            .setDescription(
                `Hey ${member.user.username}!\n\n` +
                `Leuk dat je er bent. Verifieer jezelf in <#${CONFIG.VERIFY_CHANNEL_ID}> om toegang te krijgen tot de server.\n\n` +
                `Als je vragen hebt, kan je altijd een admin aanspreken.`
            )
            .setColor(PURPLE.main)
            .setThumbnail(CONFIG.LOGO_URL);
        await member.send({ embeds: [dmEmbed] });
    } catch (err) {}

    await sendLog(member.guild, CONFIG.JOIN_LEAVE_LOG_ID, {
        title: '📥 Lid gejoint',
        description:
            `**Gebruiker:** ${member.user.tag} (\`${member.id}\`)\n` +
            `**Account aangemaakt:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
            `**Leden nu:** ${member.guild.memberCount}`,
        color: PURPLE.main,
        thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
    });
});

client.on('guildMemberRemove', async (member) => {
    updateStatus(member.guild);
    scheduleMembersUpdate();

    const joinedAt = joinTimes[member.id];
    let durationText = 'Onbekend';
    if (joinedAt) {
        durationText = formatDuration(Date.now() - joinedAt);
        delete joinTimes[member.id];
        await saveToGist();
    }

    const hadVerify = member.roles.cache.has(CONFIG.VERIFY_ROLE_ID);
    const hadSnap = member.roles.cache.has(CONFIG.SNAP_ROLE_ID);

    await sendLog(member.guild, CONFIG.JOIN_LEAVE_LOG_ID, {
        title: '📤 Lid verlaten',
        description:
            `**Gebruiker:** ${member.user.tag} (\`${member.id}\`)\n` +
            `**In server voor:** ${durationText}\n` +
            `**Had verify:** ${hadVerify ? 'ja' : 'nee'}\n` +
            `**Had snapchat ping:** ${hadSnap ? 'ja' : 'nee'}`,
        color: PURPLE.dark,
        thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
    });

    if (hadVerify) {
        roleCountCache.delete(CONFIG.VERIFY_ROLE_ID);
        await refreshPanel(CONFIG.VERIFY_CHANNEL_ID, CONFIG.VERIFY_BUTTON_ID, '✅', ButtonStyle.Success, CONFIG.VERIFY_ROLE_ID);
        await sendLog(member.guild, CONFIG.VERIFY_LOG_ID, {
            title: '❌ Verify verlaten',
            description: `${member.user.tag} (\`${member.id}\`) heeft de server verlaten en had de verify rol.`,
            color: PURPLE.dark,
            thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    }

    if (hadSnap) {
        roleCountCache.delete(CONFIG.SNAP_ROLE_ID);
        await refreshPanel(CONFIG.SNAP_CHANNEL_ID, CONFIG.SNAP_BUTTON_ID, '👻', ButtonStyle.Primary, CONFIG.SNAP_ROLE_ID);
        await sendLog(member.guild, CONFIG.SNAP_LOG_ID, {
            title: '❌ Snapchat Ping verlaten',
            description: `${member.user.tag} (\`${member.id}\`) heeft de server verlaten en had de Snapchat Ping rol.`,
            color: PURPLE.dark,
            thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const oldVerify = oldMember.roles.cache.has(CONFIG.VERIFY_ROLE_ID);
    const newVerify = newMember.roles.cache.has(CONFIG.VERIFY_ROLE_ID);
    const oldSnap = oldMember.roles.cache.has(CONFIG.SNAP_ROLE_ID);
    const newSnap = newMember.roles.cache.has(CONFIG.SNAP_ROLE_ID);

    let rankChanged = false;
    for (const rank of FIXED_RANKS) {
        if (oldMember.roles.cache.has(rank.roleId) !== newMember.roles.cache.has(rank.roleId)) {
            rankChanged = true;
            break;
        }
    }
    if (!rankChanged) {
        for (const cr of customRoles) {
            if (oldMember.roles.cache.has(cr.roleId) !== newMember.roles.cache.has(cr.roleId)) {
                rankChanged = true;
                break;
            }
        }
    }
    if (rankChanged) scheduleMembersUpdate();

    if (!oldVerify && newVerify) {
        roleCountCache.delete(CONFIG.VERIFY_ROLE_ID);
        await refreshPanel(CONFIG.VERIFY_CHANNEL_ID, CONFIG.VERIFY_BUTTON_ID, '✅', ButtonStyle.Success, CONFIG.VERIFY_ROLE_ID);
        await sendLog(newMember.guild, CONFIG.VERIFY_LOG_ID, {
            title: '✅ Verify gekregen',
            description: `${newMember.user.tag} (\`${newMember.id}\`) heeft de verify rol gekregen.`,
            color: PURPLE.main,
            thumbnail: newMember.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle(`Je bent geverifieerd!`)
                .setDescription(
                    `Bedankt voor het verifiëren bij **${CONFIG.SERVER_NAME}**!\n\n` +
                    `Je hebt nu toegang tot de server. Veel plezier! 🎉`
                )
                .setColor(PURPLE.main)
                .setThumbnail(CONFIG.LOGO_URL);
            await newMember.send({ embeds: [dmEmbed] });
        } catch (err) {}
    } else if (oldVerify && !newVerify) {
        roleCountCache.delete(CONFIG.VERIFY_ROLE_ID);
        await refreshPanel(CONFIG.VERIFY_CHANNEL_ID, CONFIG.VERIFY_BUTTON_ID, '✅', ButtonStyle.Success, CONFIG.VERIFY_ROLE_ID);
        await sendLog(newMember.guild, CONFIG.VERIFY_LOG_ID, {
            title: '❌ Verify verwijderd',
            description: `${newMember.user.tag} (\`${newMember.id}\`) is niet meer geverifieerd.`,
            color: PURPLE.dark,
            thumbnail: newMember.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    }

    if (!oldSnap && newSnap) {
        roleCountCache.delete(CONFIG.SNAP_ROLE_ID);
        await refreshPanel(CONFIG.SNAP_CHANNEL_ID, CONFIG.SNAP_BUTTON_ID, '👻', ButtonStyle.Primary, CONFIG.SNAP_ROLE_ID);
        await sendLog(newMember.guild, CONFIG.SNAP_LOG_ID, {
            title: '👻 Snapchat Ping gekregen',
            description: `${newMember.user.tag} (\`${newMember.id}\`) heeft de Snapchat Ping rol gekregen.`,
            color: PURPLE.main,
            thumbnail: newMember.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    } else if (oldSnap && !newSnap) {
        roleCountCache.delete(CONFIG.SNAP_ROLE_ID);
        await refreshPanel(CONFIG.SNAP_CHANNEL_ID, CONFIG.SNAP_BUTTON_ID, '👻', ButtonStyle.Primary, CONFIG.SNAP_ROLE_ID);
        await sendLog(newMember.guild, CONFIG.SNAP_LOG_ID, {
            title: '❌ Snapchat Ping verwijderd',
            description: `${newMember.user.tag} (\`${newMember.id}\`) heeft de Snapchat Ping rol niet meer.`,
            color: PURPLE.dark,
            thumbnail: newMember.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    }
});

// --- ANTI-NUKE HELPERS ---
function checkThreshold(userId, type) {
    const key = `${userId}:${type}`;
    const now = Date.now();
    const list = (actionTracker.get(key) || []).filter(t => now - t < CONFIG.ANTINUKE_WINDOW_MS);
    list.push(now);
    actionTracker.set(key, list);
    const limit = CONFIG.ANTINUKE_LIMITS[type] || 999;
    return list.length >= limit;
}

async function findExecutor(guild, type, targetId) {
    try {
        const logs = await guild.fetchAuditLogs({ type, limit: 5 });
        const entry = logs.entries.find(e =>
            (!targetId || e.target?.id === targetId) &&
            Date.now() - e.createdTimestamp < 15000
        );
        return entry ? entry.executor : null;
    } catch (err) {
        return null;
    }
}

async function punishUser(guild, userId, reason) {
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return;
        const removable = member.roles.cache.filter(r =>
            r.id !== guild.id && guild.members.me.roles.highest.position > r.position
        );
        if (removable.size > 0) {
            await member.roles.remove(removable, `Anti-nuke: ${reason}`).catch(() => {});
        }
        await member.kick(`Anti-nuke: ${reason}`).catch(() => {});
        await sendLog(guild, CONFIG.JOIN_LEAVE_LOG_ID, {
            title: '🚨 Anti-nuke actie',
            description: `**Gebruiker:** ${member.user.tag} (\`${member.id}\`)\n**Reden:** ${reason}`,
            color: PURPLE.dark,
            thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    } catch (err) {
        console.error('Fout bij straffen user:', err);
    }
}

async function handleNukeAction(guild, type, targetId) {
    if (!antinukeData.enabled) return;
    const executor = await findExecutor(guild, type, targetId);
    if (!executor) return;
    if (executor.id === client.user.id) return;
    if (CONFIG.ANTINUKE_ALLOWED_USERS.includes(executor.id)) return;
    if (checkThreshold(executor.id, type)) {
        await punishUser(guild, executor.id, `Te veel ${type} acties binnen ${CONFIG.ANTINUKE_WINDOW_MS / 1000}s`);
    }
}

client.on('channelDelete', async (channel) => {
    if (!channel.guild) return;
    await handleNukeAction(channel.guild, 'channelDelete', channel.id);
});

client.on('roleDelete', async (role) => {
    if (!role.guild) return;
    await handleNukeAction(role.guild, 'roleDelete', role.id);
});

client.on('guildBanAdd', async (ban) => {
    await handleNukeAction(ban.guild, 'banAdd', ban.user.id);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.channel.id === CONFIG.HONEYPOT_CHANNEL_ID) {
        await message.delete().catch(() => {});
        const member = message.member;
        if (!member) return;
        try {
            await member.kick('Honeypot kanaal - bericht geplaatst');
            kickData.total += 1;
            await saveToGist();
            await refreshHoneypotEmbed(message.channel);
            const embed = new EmbedBuilder()
                .setTitle('🍯 Honeypot geactiveerd')
                .setDescription(
                    `**Gebruiker:** ${message.author.tag} (\`${message.author.id}\`)\n` +
                    `**Actie:** KICK\n` +
                    `**Totaal aantal kicks:** ${kickData.total}`
                )
                .setColor(PURPLE.dark)
                .setTimestamp();
            await message.channel.send({ embeds: [embed] }).catch(() => {});

            await sendLog(message.guild, CONFIG.HONEYPOT_LOG_ID, {
                title: '🍯 Honeypot kick',
                description:
                    `**Gebruiker:** ${message.author.tag} (\`${message.author.id}\`)\n` +
                    `**Actie:** KICK\n` +
                    `**Kanaal:** <#${CONFIG.HONEYPOT_CHANNEL_ID}>\n` +
                    `**Totaal aantal kicks:** ${kickData.total}\n` +
                    `**Bericht:** ${message.content ? message.content.slice(0, 200) : '_Geen tekst_'}`,
                color: PURPLE.dark,
                thumbnail: message.author.displayAvatarURL({ dynamic: true, size: 128 })
            });
        } catch (err) {
            console.error('Fout bij honeypot kick:', err);
        }
        return;
    }

    if (message.channel.id === CONFIG.COUNTING_CHANNEL_ID) {
        await handleCountingMessage(message);
        return;
    }

    if (message.guild) {
        const protectedChannels = [
            CONFIG.HONEYPOT_CHANNEL_ID,
            CONFIG.HONEYPOT_LOG_ID,
            CONFIG.VERIFY_LOG_ID,
            CONFIG.SNAP_LOG_ID,
            CONFIG.CALL_LOG_ID,
            CONFIG.JOIN_LEAVE_LOG_ID,
            CONFIG.MEMBERS_LIST_CHANNEL_ID,
            CONFIG.CUSTOM_ROLE_PANEL_CHANNEL_ID,
            CONFIG.GIVEAWAY_CHANNEL_ID,
            CONFIG.GIVEAWAY_LOG_ID,
            CONFIG.ROLE_MANAGER_LOG_ID,
            CONFIG.COUNTING_CHANNEL_ID,
            CONFIG.CASINO_CHANNEL_ID,
            CONFIG.CASINO_LEADERBOARD_CHANNEL_ID
        ];
        if (!protectedChannels.includes(message.channel.id)) {
            const deleted = await handleAntiLink(message);
            if (deleted) return;
        }
    }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    const channelId = oldState.channelId || newState.channelId;
    if (!channelId) return;
    if (!activeCalls.has(channelId)) return;

    const call = activeCalls.get(channelId);
    if (!call) return;

    const channel = newState.guild.channels.cache.get(channelId) || oldState.guild.channels.cache.get(channelId);
    if (!channel) return;

    if (oldState.channelId === channelId && newState.channelId !== channelId && oldState.id === call.ownerId) {
        try {
            await channel.delete('Call eigenaar heeft de call verlaten').catch(() => {});
        } catch (err) {
            console.error('Fout bij verwijderen call:', err);
        }
        activeCalls.delete(channelId);
        callAllowed.delete(channelId);
        callInfoMessages.delete(channelId);
        return;
    }

    const members = channel.members.filter(m => !m.user.bot);
    if (members.size === 0) {
        if (!call.emptySince) call.emptySince = Date.now();
    } else {
        call.emptySince = null;
    }
    activeCalls.set(channelId, call);
});

async function checkEmptyCalls() {
    const now = Date.now();
    for (const [channelId, call] of activeCalls.entries()) {
        try {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (!channel) {
                activeCalls.delete(channelId);
                callAllowed.delete(channelId);
                callInfoMessages.delete(channelId);
                continue;
            }

            const members = channel.members.filter(m => !m.user.bot);
            if (members.size > 0) {
                call.emptySince = null;
                activeCalls.set(channelId, call);
                continue;
            }

            if (!call.emptySince) {
                call.emptySince = now;
                activeCalls.set(channelId, call);
                continue;
            }

            if (now - call.emptySince >= CONFIG.EMPTY_CALL_TIMEOUT_MS) {
                await channel.delete('Call was leeg voor 1 uur').catch(() => {});
                activeCalls.delete(channelId);
                callAllowed.delete(channelId);
                callInfoMessages.delete(channelId);
                console.log(`Lege call verwijderd: ${channelId}`);
            }
        } catch (err) {
            console.error('Fout bij check lege call:', err);
        }
    }
}

client.on('interactionCreate', async (interaction) => {

    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'clear') {
            const amount = interaction.options.getInteger('amount');
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({ content: 'Je hebt geen toestemming om dit te doen.', flags: MessageFlags.Ephemeral });
            }
            try {
                await interaction.channel.bulkDelete(amount, true);
                await interaction.reply({ content: `${amount} berichten verwijderd.`, flags: MessageFlags.Ephemeral });
            } catch (err) {
                console.error('Fout bij clear:', err);
                await interaction.reply({ content: 'Kon de berichten niet verwijderen.', flags: MessageFlags.Ephemeral });
            }
        }

        if (interaction.commandName === 'antinuke') {
            if (!CONFIG.ANTINUKE_ALLOWED_USERS.includes(interaction.user.id)) {
                return interaction.reply({ content: 'Je hebt geen toestemming om dit te gebruiken.', flags: MessageFlags.Ephemeral });
            }
            const actie = interaction.options.getString('actie');
            if (actie === 'enable') {
                if (antinukeData.enabled) {
                    return interaction.reply({ content: 'Anti-nuke is al ingeschakeld.', flags: MessageFlags.Ephemeral });
                }
                antinukeData.enabled = true;
                await saveToGist();
                await sendLog(interaction.guild, CONFIG.JOIN_LEAVE_LOG_ID, {
                    title: '🛡️ Anti-nuke ingeschakeld',
                    description: `Ingeschakeld door ${interaction.user.tag}.`,
                    color: PURPLE.main
                });
                return interaction.reply({ content: 'Anti-nuke is nu **ingeschakeld**.', flags: MessageFlags.Ephemeral });
            }
            if (actie === 'disable') {
                if (!antinukeData.enabled) {
                    return interaction.reply({ content: 'Anti-nuke is al uitgeschakeld.', flags: MessageFlags.Ephemeral });
                }
                antinukeData.enabled = false;
                await saveToGist();
                await sendLog(interaction.guild, CONFIG.JOIN_LEAVE_LOG_ID, {
                    title: '🛡️ Anti-nuke uitgeschakeld',
                    description: `Uitgeschakeld door ${interaction.user.tag}.`,
                    color: PURPLE.dark
                });
                return interaction.reply({ content: 'Anti-nuke is nu **uitgeschakeld**.', flags: MessageFlags.Ephemeral });
            }
        }

        if (interaction.commandName === 'refresh') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            try {
                await updateMembersList();
                await updateCustomRolePanel();
                await interaction.editReply({ content: '✅ Ledenlijst en custom role panel bijgewerkt.' });
            } catch (err) {
                console.error('Fout bij refresh:', err);
                await interaction.editReply({ content: '❌ Kon niet bijwerken.' });
            }
        }

        if (interaction.commandName === 'customroles') {
            if (!isCustomRoleManager(interaction)) {
                return interaction.reply({ content: 'Je hebt geen toestemming om dit te gebruiken.', flags: MessageFlags.Ephemeral });
            }
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            try {
                await migrateDefaultCustomRoles();
                await updateCustomRolePanel();
                await interaction.editReply({ content: '✅ Custom role panel vernieuwd.' });
            } catch (err) {
                console.error('Fout bij customroles:', err);
                await interaction.editReply({ content: '❌ Kon panel niet vernieuwen.' });
            }
        }

        if (interaction.commandName === 'createbackup') {
            if (!isBackupManager(interaction.user.id)) {
                return interaction.reply({ content: 'Je hebt geen toestemming om dit te gebruiken.', flags: MessageFlags.Ephemeral });
            }
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            try {
                const backupId = await createBackup(interaction.guild, interaction.user);
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('✅ Backup aangemaakt')
                        .setDescription(
                            `Je backup is klaar.\n\n` +
                            `**Backup ID:** \`${backupId}\`\n\n` +
                            `Bewaar deze code goed. Je kan hem gebruiken met \`/loadbackup id:${backupId}\`.`
                        )
                        .setColor(PURPLE.main)
                        .setThumbnail(CONFIG.LOGO_URL);
                    await interaction.user.send({ embeds: [dmEmbed] });
                } catch (err) {
                    console.log('Kon geen DM sturen naar user.');
                }
                await interaction.editReply({ content: `✅ Backup aangemaakt. De code is in je DM gestuurd.` });
            } catch (err) {
                console.error('Fout bij createbackup:', err);
                await interaction.editReply({ content: `❌ Kon backup niet maken: ${err.message}` });
            }
        }

        if (interaction.commandName === 'loadbackup') {
            if (!isBackupManager(interaction.user.id)) {
                return interaction.reply({ content: 'Je hebt geen toestemming om dit te gebruiken.', flags: MessageFlags.Ephemeral });
            }
            const backupId = interaction.options.getString('id').toUpperCase();
            if (!backups[backupId]) {
                return interaction.reply({ content: `❌ Backup \`${backupId}\` niet gevonden.`, flags: MessageFlags.Ephemeral });
            }
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            try {
                const result = await loadBackup(interaction.guild, backupId);
                const embed = new EmbedBuilder()
                    .setTitle('✅ Backup geladen')
                    .setDescription(
                        `**Backup ID:** \`${backupId}\`\n\n` +
                        `**Rollen aangemaakt:** ${result.rolesCreated}\n` +
                        `**Rollen bijgewerkt:** ${result.rolesUpdated}\n` +
                        `**Categorieën aangemaakt:** ${result.categoriesCreated}\n` +
                        `**Kanalen aangemaakt:** ${result.channelsCreated}\n` +
                        `**Kanalen bijgewerkt:** ${result.channelsUpdated}\n\n` +
                        (result.errors.length > 0
                            ? `**Fouten:**\n${result.errors.slice(0, 10).map(e => `- ${e}`).join('\n')}`
                            : '_Geen fouten._')
                    )
                    .setColor(PURPLE.main)
                    .setThumbnail(CONFIG.LOGO_URL);
                await interaction.editReply({ embeds: [embed] });
            } catch (err) {
                console.error('Fout bij loadbackup:', err);
                await interaction.editReply({ content: `❌ Kon backup niet laden: ${err.message}` });
            }
        }

        if (interaction.commandName === 'giveaway') {
            if (!isGiveawayManager(interaction)) {
                return interaction.reply({ content: 'Je hebt geen toestemming om dit te gebruiken.', flags: MessageFlags.Ephemeral });
            }
            const prize = interaction.options.getString('prijs');
            const duurInput = interaction.options.getString('duur');
            const winnersCount = interaction.options.getInteger('winnaars') || 1;

            const durationMs = parseDurationInput(duurInput);
            if (!durationMs) {
                return interaction.reply({
                    content: '❌ Ongeldige duur. Gebruik bijv. `10s`, `1u`, `1d`, `2d`.',
                    flags: MessageFlags.Ephemeral
                });
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            try {
                const channel = await client.channels.fetch(CONFIG.GIVEAWAY_CHANNEL_ID);
                if (!channel || !channel.isTextBased()) {
                    return interaction.editReply({ content: '❌ Giveaway kanaal niet gevonden.' });
                }

                const endsAt = Date.now() + durationMs;

                const gwData = {
                    channelId: CONFIG.GIVEAWAY_CHANNEL_ID,
                    prize,
                    endsAt,
                    winnersCount,
                    participants: [],
                    winners: [],
                    ended: false,
                    hostId: interaction.user.id
                };

                const tempEmbed = new EmbedBuilder()
                    .setTitle('🎉 Giveaway')
                    .setDescription(
                        `**Prijs:** ${prize}\n\n` +
                        `**Eindigt:** <t:${Math.floor(endsAt / 1000)}:R>\n**Deelnemers:** 0`
                    )
                    .setColor(PURPLE.main)
                    .setThumbnail(CONFIG.LOGO_URL)
                    .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL })
                    .setTimestamp();

                const sent = await channel.send({ embeds: [tempEmbed] });
                gwData.messageId = sent.id;
                giveaways[sent.id] = gwData;
                await saveToGist();

                await sent.edit({
                    embeds: [buildGiveawayEmbed(gwData)],
                    components: buildGiveawayRows(sent.id, false)
                });

                startGiveawayTimer(sent.id);

                await interaction.editReply({ content: `✅ Giveaway gestart in <#${CONFIG.GIVEAWAY_CHANNEL_ID}>.` });

                await sendLog(interaction.guild, CONFIG.GIVEAWAY_LOG_ID, {
                    title: '🎉 Giveaway gestart',
                    description:
                        `**Prijs:** ${prize}\n` +
                        `**Duur:** ${duurInput}\n` +
                        `**Winnaars:** ${winnersCount}\n` +
                        `**Kanaal:** <#${CONFIG.GIVEAWAY_CHANNEL_ID}>\n` +
                        `**Door:** ${interaction.user.tag} (\`${interaction.user.id}\`)`,
                    color: PURPLE.main,
                    thumbnail: interaction.user.displayAvatarURL({ dynamic: true, size: 128 })
                });
            } catch (err) {
                console.error('Fout bij giveaway:', err);
                await interaction.editReply({ content: `❌ Kon giveaway niet starten: ${err.message}` });
            }
        }

        if (interaction.commandName === 'resetgame') {
            const game = interaction.options.getString('game');

            if (game === 'counting') {
                if (!isCustomRoleManager(interaction)) {
                    return interaction.reply({ content: 'Je hebt geen toestemming om dit te doen.', flags: MessageFlags.Ephemeral });
                }

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const state = countingState[CONFIG.COUNTING_CHANNEL_ID] || {
                    current: 0,
                    lastUserId: null,
                    highScore: 0,
                    lastMessageId: null
                };
                state.current = 0;
                state.lastUserId = null;
                countingState[CONFIG.COUNTING_CHANNEL_ID] = state;
                await saveToGist();

                return interaction.editReply({ content: '✅ Tel-spel is gereset. De highscore blijft bewaard.' });
            }

            return interaction.reply({ content: '❌ Onbekend spel.', flags: MessageFlags.Ephemeral });
        }

        if (interaction.commandName === 'blackjack') {
            const bet = interaction.options.getInteger('inzet');
            await playBlackjack(interaction, bet);
        }

        if (interaction.commandName === 'roulette') {
            const bet = interaction.options.getInteger('inzet');
            const choice = interaction.options.getString('kleur');
            await playRoulette(interaction, bet, choice);
        }

        if (interaction.commandName === 'chips') {
            const user = getCasinoUser(interaction.user.id);
            const embed = new EmbedBuilder()
                .setTitle('🪙 Jouw chips')
                .setDescription(
                    `**Chips:** ${user.chips}\n` +
                    `**Wins:** ${user.wins}\n` +
                    `**Losses:** ${user.losses}\n` +
                    `**Games gespeeld:** ${user.gamesPlayed}`
                )
                .setColor(CASINO_GOLD)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
        return;
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'call_modal_public' || interaction.customId === 'call_modal_private') {
            const isPrivate = interaction.customId === 'call_modal_private';
            const name = interaction.fields.getTextInputValue('call_name');

            await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});

            let myActiveCalls = 0;
            for (const [, call] of activeCalls.entries()) {
                if (call.ownerId === interaction.user.id) myActiveCalls++;
            }
            if (myActiveCalls >= CONFIG.MAX_CALLS_PER_USER) {
                return interaction.editReply({ content: `❌ Je hebt al een actieve call. Je mag max ${CONFIG.MAX_CALLS_PER_USER} call hebben.` });
            }

            try {
                await createCall(interaction, name, isPrivate);
            } catch (err) {
                console.error('Fout bij maken call:', err);
                try {
                    await interaction.editReply({ content: 'Kon de call niet aanmaken.', embeds: [], components: [] });
                } catch (e) {}
            }
            return;
        }

        if (interaction.customId === 'cr_modal_add') {
            if (!isCustomRoleManager(interaction)) {
                return interaction.reply({ content: 'Je hebt geen toestemming.', flags: MessageFlags.Ephemeral });
            }
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const rawName = interaction.fields.getTextInputValue('cr_name').trim();
            if (!rawName) {
                return interaction.editReply({ content: '❌ Ongeldige naam.' });
            }
            const fontName = toFont(rawName);

            try {
                const guild = interaction.guild;
                const newRole = await guild.roles.create({
                    name: fontName,
                    color: 0x9b59b6,
                    reason: `Custom role aangemaakt door ${interaction.user.tag}`
                });
                customRoles.push({
                    name: fontName,
                    roleId: newRole.id,
                    order: customRoles.length
                });
                await saveToGist();
                await updateCustomRolePanel();
                await updateMembersList();
                await interaction.editReply({ content: `✅ Rol **${fontName}** aangemaakt.` });

                await sendLog(interaction.guild, CONFIG.ROLE_MANAGER_LOG_ID, {
                    title: '➕ Custom rol toegevoegd',
                    description: `**Naam:** ${fontName}\n**Rol:** <@&${newRole.id}>\n**Door:** ${interaction.user.tag} (\`${interaction.user.id}\`)`,
                    color: PURPLE.main,
                    thumbnail: interaction.user.displayAvatarURL({ dynamic: true, size: 128 })
                });
            } catch (err) {
                console.error('Fout bij maken custom role:', err);
                await interaction.editReply({ content: `❌ Kon rol niet aanmaken: ${err.message}` });
            }
            return;
        }

        if (interaction.customId.startsWith('cr_modal_rename_')) {
            if (!isCustomRoleManager(interaction)) {
                return interaction.reply({ content: 'Je hebt geen toestemming.', flags: MessageFlags.Ephemeral });
            }
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const roleId = interaction.customId.replace('cr_modal_rename_', '');
            const rawName = interaction.fields.getTextInputValue('cr_name').trim();
            if (!rawName) {
                return interaction.editReply({ content: '❌ Ongeldige naam.' });
            }
            const fontName = toFont(rawName);
            const cr = customRoles.find(c => c.roleId === roleId);
            if (!cr) {
                return interaction.editReply({ content: '❌ Rol niet gevonden in de database.' });
            }
            try {
                const guild = interaction.guild;
                const role = guild.roles.cache.get(roleId);
                if (role) await role.setName(fontName).catch(() => {});
                cr.name = fontName;
                await saveToGist();
                await updateCustomRolePanel();
                await updateMembersList();
                await interaction.editReply({ content: `✅ Rol hernoemd naar **${fontName}**.` });

                await sendLog(interaction.guild, CONFIG.ROLE_MANAGER_LOG_ID, {
                    title: '✏️ Custom rol hernoemd',
                    description: `**Nieuwe naam:** ${fontName}\n**Rol:** <@&${roleId}>\n**Door:** ${interaction.user.tag} (\`${interaction.user.id}\`)`,
                    color: PURPLE.main,
                    thumbnail: interaction.user.displayAvatarURL({ dynamic: true, size: 128 })
                });
            } catch (err) {
                console.error('Fout bij hernoemen custom role:', err);
                await interaction.editReply({ content: `❌ Kon rol niet hernoemen: ${err.message}` });
            }
            return;
        }
        return;
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'cr_select_remove') {
            if (!isCustomRoleManager(interaction)) {
                return interaction.reply({ content: 'Je hebt geen toestemming.', flags: MessageFlags.Ephemeral });
            }
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const roleId = interaction.values[0];
            const idx = customRoles.findIndex(c => c.roleId === roleId);
            if (idx === -1) {
                return interaction.editReply({ content: '❌ Rol niet gevonden.' });
            }
            try {
                const guild = interaction.guild;
                const role = guild.roles.cache.get(roleId);
                if (role) await role.delete('Custom role verwijderd').catch(() => {});
                customRoles.splice(idx, 1);
                customRoles.forEach((c, i) => c.order = i);
                await saveToGist();
                await updateCustomRolePanel();
                await updateMembersList();
                await interaction.editReply({ content: '✅ Rol verwijderd.' });

                await sendLog(interaction.guild, CONFIG.ROLE_MANAGER_LOG_ID, {
                    title: '➖ Custom rol verwijderd',
                    description: `**Rol ID:** \`${roleId}\`\n**Door:** ${interaction.user.tag} (\`${interaction.user.id}\`)`,
                    color: PURPLE.dark,
                    thumbnail: interaction.user.displayAvatarURL({ dynamic: true, size: 128 })
                });
            } catch (err) {
                console.error('Fout bij verwijderen custom role:', err);
                await interaction.editReply({ content: `❌ Kon rol niet verwijderen: ${err.message}` });
            }
            return;
        }

        if (interaction.customId === 'cr_select_rename') {
            if (!isCustomRoleManager(interaction)) {
                return interaction.reply({ content: 'Je hebt geen toestemming.', flags: MessageFlags.Ephemeral });
            }
            const roleId = interaction.values[0];
            const cr = customRoles.find(c => c.roleId === roleId);
            if (!cr) {
                return interaction.reply({ content: '❌ Rol niet gevonden.', flags: MessageFlags.Ephemeral });
            }
            const modal = new ModalBuilder()
                .setCustomId(`cr_modal_rename_${roleId}`)
                .setTitle('Custom role hernoemen');
            const input = new TextInputBuilder()
                .setCustomId('cr_name')
                .setLabel('Nieuwe naam (zonder font)')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(50)
                .setRequired(true)
                .setValue(cr.name);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (interaction.customId === 'cr_select_move') {
            if (!isCustomRoleManager(interaction)) {
                return interaction.reply({ content: 'Je hebt geen toestemming.', flags: MessageFlags.Ephemeral });
            }
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const [roleId, direction] = interaction.values[0].split(':');
            const idx = customRoles.findIndex(c => c.roleId === roleId);
            if (idx === -1) {
                return interaction.editReply({ content: '❌ Rol niet gevonden.' });
            }
            const target = direction === 'up' ? idx - 1 : idx + 1;
            if (target < 0 || target >= customRoles.length) {
                return interaction.editReply({ content: '❌ Kan niet verder verplaatsen.' });
            }
            const tmp = customRoles[idx];
            customRoles[idx] = customRoles[target];
            customRoles[target] = tmp;
            customRoles.forEach((c, i) => c.order = i);
            await saveToGist();
            await updateCustomRolePanel();
            await updateMembersList();
            await interaction.editReply({ content: '✅ Volgorde aangepast.' });

            await sendLog(interaction.guild, CONFIG.ROLE_MANAGER_LOG_ID, {
                title: '🔀 Custom rol volgorde gewijzigd',
                description: `**Rol:** <@&${roleId}>\n**Richting:** ${direction}\n**Door:** ${interaction.user.tag} (\`${interaction.user.id}\`)`,
                color: PURPLE.main,
                thumbnail: interaction.user.displayAvatarURL({ dynamic: true, size: 128 })
            });
            return;
        }

        if (interaction.customId.startsWith('gw_reroll_old_')) {
            if (!isGiveawayManager(interaction)) {
                return interaction.reply({ content: 'Je hebt geen toestemming om te rerollen.', flags: MessageFlags.Ephemeral });
            }
            const messageId = interaction.customId.replace('gw_reroll_old_', '');
            const gw = giveaways[messageId];
            if (!gw) {
                return interaction.reply({ content: 'Deze giveaway bestaat niet meer.', flags: MessageFlags.Ephemeral });
            }
            const oldWinner = interaction.values[0];
            if (!gw.winners.includes(oldWinner)) {
                return interaction.reply({ content: 'Deze gebruiker was geen winnaar.', flags: MessageFlags.Ephemeral });
            }

            const eligible = gw.participants.filter(id => !gw.winners.includes(id) && id !== oldWinner);
            if (eligible.length === 0) {
                return interaction.reply({ content: 'Er zijn geen andere deelnemers om als nieuwe winnaar te kiezen.', flags: MessageFlags.Ephemeral });
            }

            const options = eligible.slice(0, 25).map(id => ({
                label: `Deelnemer: ${id}`,
                value: id
            }));

            const select = new StringSelectMenuBuilder()
                .setCustomId(`gw_reroll_new_${messageId}_${oldWinner}`)
                .setPlaceholder('Kies de nieuwe winnaar')
                .addOptions(options);

            return interaction.update({
                content: `Oude winnaar: <@${oldWinner}>. Kies de nieuwe winnaar:`,
                components: [new ActionRowBuilder().addComponents(select)]
            });
        }

        if (interaction.customId.startsWith('gw_reroll_new_')) {
            if (!isGiveawayManager(interaction)) {
                return interaction.reply({ content: 'Je hebt geen toestemming om te rerollen.', flags: MessageFlags.Ephemeral });
            }
            const rest = interaction.customId.replace('gw_reroll_new_', '');
            const parts = rest.split('_');
            const oldWinner = parts.pop();
            const messageId = parts.join('_');

            const gw = giveaways[messageId];
            if (!gw) {
                return interaction.reply({ content: 'Deze giveaway bestaat niet meer.', flags: MessageFlags.Ephemeral });
            }

            const newWinner = interaction.values[0];
            if (!gw.participants.includes(newWinner)) {
                return interaction.reply({ content: 'Deze gebruiker deed niet mee aan de giveaway.', flags: MessageFlags.Ephemeral });
            }

            const winnerIdx = gw.winners.indexOf(oldWinner);
            if (winnerIdx === -1) {
                return interaction.reply({ content: 'De oude winnaar is niet meer geldig.', flags: MessageFlags.Ephemeral });
            }
            gw.winners[winnerIdx] = newWinner;
            await saveToGist();

            try {
                const channel = await client.channels.fetch(gw.channelId);
                const msg = await channel.messages.fetch(messageId);
                await msg.edit({ embeds: [buildGiveawayEmbed(gw)], components: buildGiveawayRows(messageId, true) });
                await channel.send(`🔁 Nieuwe winnaar: <@${newWinner}>! Je hebt **${gw.prize}** gewonnen (oude winnaar <@${oldWinner}> had niet geclaimd).`);
            } catch (err) {}

            await sendLog(interaction.guild, CONFIG.GIVEAWAY_LOG_ID, {
                title: '🔁 Giveaway reroll',
                description:
                    `**Prijs:** ${gw.prize}\n` +
                    `**Oude winnaar:** <@${oldWinner}>\n` +
                    `**Nieuwe winnaar:** <@${newWinner}>\n` +
                    `**Door:** ${interaction.user.tag} (\`${interaction.user.id}\`)`,
                color: PURPLE.main,
                thumbnail: interaction.user.displayAvatarURL({ dynamic: true, size: 128 })
            });

            return interaction.update({ content: `✅ Nieuwe winnaar ingesteld: <@${newWinner}>.`, components: [] });
        }

        if (interaction.customId.startsWith('call_allow_select_')) {
            const channelId = interaction.customId.replace('call_allow_select_', '');
            const call = activeCalls.get(channelId);
            if (!call) {
                return interaction.reply({ content: 'Deze call bestaat niet meer.', flags: MessageFlags.Ephemeral });
            }
            if (interaction.user.id !== call.ownerId) {
                return interaction.reply({ content: 'Alleen de eigenaar kan mensen toelaten.', flags: MessageFlags.Ephemeral });
            }

            const userId = interaction.values[0];
            try {
                const channel = await client.channels.fetch(channelId);
                await channel.permissionOverwrites.edit(userId, { ViewChannel: true, Connect: true });
                if (!callAllowed.has(channelId)) callAllowed.set(channelId, new Set());
                callAllowed.get(channelId).add(userId);

                await updateCallControlMessage(channelId, call.ownerId, call.isPrivate);

                await interaction.reply({ content: `<@${userId}> is toegelaten tot de call.`, flags: MessageFlags.Ephemeral });

                try {
                    const payload = buildCallInfoMessage(channelId, call.ownerId, call.isPrivate);
                    await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
                } catch (e) {}

                await sendLog(interaction.guild, CONFIG.CALL_LOG_ID, {
                    title: '✅ Toegelaten tot call',
                    description: `**Eigenaar:** <@${call.ownerId}>\n**Toegelaten:** <@${userId}>\n**Call:** <#${channelId}>`,
                    color: PURPLE.main
                });
            } catch (err) {
                console.error('Fout bij toelaten user:', err);
                await interaction.reply({ content: 'Kon de gebruiker niet toelaten.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
            return;
        }

        if (interaction.customId.startsWith('call_remove_select_')) {
            const channelId = interaction.customId.replace('call_remove_select_', '');
            const call = activeCalls.get(channelId);
            if (!call) {
                return interaction.reply({ content: 'Deze call bestaat niet meer.', flags: MessageFlags.Ephemeral });
            }
            if (interaction.user.id !== call.ownerId) {
                return interaction.reply({ content: 'Alleen de eigenaar kan mensen verwijderen.', flags: MessageFlags.Ephemeral });
            }

            const userId = interaction.values[0];
            if (userId === call.ownerId) {
                return interaction.reply({ content: 'Je kan jezelf niet verwijderen.', flags: MessageFlags.Ephemeral });
            }

            try {
                const channel = await client.channels.fetch(channelId);
                await channel.permissionOverwrites.delete(userId).catch(() => {});
                const allowed = callAllowed.get(channelId);
                if (allowed) allowed.delete(userId);

                const voiceMember = channel.members.get(userId);
                if (voiceMember) {
                    await voiceMember.voice.disconnect('Verwijderd uit call door eigenaar').catch(() => {});
                }

                await updateCallControlMessage(channelId, call.ownerId, call.isPrivate);

                await interaction.reply({ content: `<@${userId}> is verwijderd uit de call.`, flags: MessageFlags.Ephemeral });

                try {
                    const payload = buildCallInfoMessage(channelId, call.ownerId, call.isPrivate);
                    await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
                } catch (e) {}

                await sendLog(interaction.guild, CONFIG.CALL_LOG_ID, {
                    title: '➖ Verwijderd uit call',
                    description: `**Eigenaar:** <@${call.ownerId}>\n**Verwijderd:** <@${userId}>\n**Call:** <#${channelId}>`,
                    color: PURPLE.dark
                });
            } catch (err) {
                console.error('Fout bij verwijderen user uit call:', err);
                await interaction.reply({ content: 'Kon de gebruiker niet verwijderen.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
            return;
        }
        return;
    }

    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('gw_join_') || (interaction.customId.startsWith('gw_reroll_') && !interaction.customId.startsWith('gw_reroll_old_') && !interaction.customId.startsWith('gw_reroll_new_'))) {
        return handleGiveawayButton(interaction);
    }

    if (interaction.customId === 'cr_add') {
        if (!isCustomRoleManager(interaction)) {
            return interaction.reply({ content: 'Je hebt geen toestemming.', flags: MessageFlags.Ephemeral });
        }
        const modal = new ModalBuilder()
            .setCustomId('cr_modal_add')
            .setTitle('Custom role toevoegen');
        const input = new TextInputBuilder()
            .setCustomId('cr_name')
            .setLabel('Naam (zonder font)')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(50)
            .setRequired(true)
            .setPlaceholder('bijv. Familie Snus Dictator');
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
    }

    if (interaction.customId === 'cr_remove') {
        if (!isCustomRoleManager(interaction)) {
            return interaction.reply({ content: 'Je hebt geen toestemming.', flags: MessageFlags.Ephemeral });
        }
        if (customRoles.length === 0) {
            return interaction.reply({ content: 'Er zijn geen custom rollen om te verwijderen.', flags: MessageFlags.Ephemeral });
        }
        const select = new StringSelectMenuBuilder()
            .setCustomId('cr_select_remove')
            .setPlaceholder('Kies een rol om te verwijderen')
            .addOptions(customRoles.map(c => ({ label: c.name, value: c.roleId })));
        return interaction.reply({
            content: 'Kies een rol om te verwijderen:',
            components: [new ActionRowBuilder().addComponents(select)],
            flags: MessageFlags.Ephemeral
        });
    }

    if (interaction.customId === 'cr_rename') {
        if (!isCustomRoleManager(interaction)) {
            return interaction.reply({ content: 'Je hebt geen toestemming.', flags: MessageFlags.Ephemeral });
        }
        if (customRoles.length === 0) {
            return interaction.reply({ content: 'Er zijn geen custom rollen om te hernoemen.', flags: MessageFlags.Ephemeral });
        }
        const select = new StringSelectMenuBuilder()
            .setCustomId('cr_select_rename')
            .setPlaceholder('Kies een rol om te hernoemen')
            .addOptions(customRoles.map(c => ({ label: c.name, value: c.roleId })));
        return interaction.reply({
            content: 'Kies een rol om te hernoemen:',
            components: [new ActionRowBuilder().addComponents(select)],
            flags: MessageFlags.Ephemeral
        });
    }

    if (interaction.customId === 'cr_up' || interaction.customId === 'cr_down') {
        if (!isCustomRoleManager(interaction)) {
            return interaction.reply({ content: 'Je hebt geen toestemming.', flags: MessageFlags.Ephemeral });
        }
        if (customRoles.length < 2) {
            return interaction.reply({ content: 'Er moeten minstens 2 rollen zijn om van volgorde te wisselen.', flags: MessageFlags.Ephemeral });
        }
        const direction = interaction.customId === 'cr_up' ? 'up' : 'down';
        const options = [];
        for (let i = 0; i < customRoles.length; i++) {
            const c = customRoles[i];
            if (direction === 'up' && i === 0) continue;
            if (direction === 'down' && i === customRoles.length - 1) continue;
            options.push({ label: c.name, value: `${c.roleId}:${direction}` });
        }
        if (options.length === 0) {
            return interaction.reply({ content: 'Geen rollen om te verplaatsen.', flags: MessageFlags.Ephemeral });
        }
        const select = new StringSelectMenuBuilder()
            .setCustomId('cr_select_move')
            .setPlaceholder(`Kies een rol om ${direction === 'up' ? 'omhoog' : 'omlaag'} te verplaatsen`)
            .addOptions(options);
        return interaction.reply({
            content: `Kies een rol om ${direction === 'up' ? 'omhoog' : 'omlaag'} te verplaatsen:`,
            components: [new ActionRowBuilder().addComponents(select)],
            flags: MessageFlags.Ephemeral
        });
    }

    if (interaction.customId === 'call_open_public' || interaction.customId === 'call_open_private') {
        const isPrivate = interaction.customId === 'call_open_private';
        const modal = new ModalBuilder()
            .setCustomId(isPrivate ? 'call_modal_private' : 'call_modal_public')
            .setTitle(isPrivate ? 'Privé call maken' : 'Openbare call maken');
        const input = new TextInputBuilder()
            .setCustomId('call_name')
            .setLabel('Naam van de call')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(50)
            .setMinLength(1)
            .setRequired(true)
            .setPlaceholder('bijv. chillen');
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
    }

    if (interaction.customId === 'call_office_panel') {
        const myCalls = [];
        for (const [channelId, call] of activeCalls.entries()) {
            if (call.ownerId === interaction.user.id) {
                myCalls.push({ channelId, ...call });
            }
        }

        if (myCalls.length === 0) {
            return interaction.reply({
                content: 'Je hebt momenteel geen actieve call. Maak eerst een call aan met **Openbaar** of **Privé**.',
                flags: MessageFlags.Ephemeral
            });
        }

        for (let i = 0; i < myCalls.length; i++) {
            const c = myCalls[i];
            const payload = buildCallInfoMessage(c.channelId, c.ownerId, c.isPrivate);
            if (i === 0) {
                await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
            }
        }
        return;
    }

    if (interaction.customId.startsWith('call_allow_') && !interaction.customId.startsWith('call_allow_select_')) {
        const channelId = interaction.customId.replace('call_allow_', '');
        const call = activeCalls.get(channelId);
        if (!call) {
            return interaction.reply({ content: 'Deze call bestaat niet meer.', flags: MessageFlags.Ephemeral });
        }
        if (interaction.user.id !== call.ownerId) {
            return interaction.reply({ content: 'Alleen de eigenaar kan mensen toelaten.', flags: MessageFlags.Ephemeral });
        }

        const selectRow = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId(`call_allow_select_${channelId}`)
                .setPlaceholder('Kies een lid om toe te laten')
                .setMinValues(1)
                .setMaxValues(1)
        );
        return interaction.reply({ content: 'Kies een lid om toe te laten:', components: [selectRow], flags: MessageFlags.Ephemeral });
    }

    if (interaction.customId.startsWith('call_remove_') && !interaction.customId.startsWith('call_remove_select_')) {
        const channelId = interaction.customId.replace('call_remove_', '');
        const call = activeCalls.get(channelId);
        if (!call) {
            return interaction.reply({ content: 'Deze call bestaat niet meer.', flags: MessageFlags.Ephemeral });
        }
        if (interaction.user.id !== call.ownerId) {
            return interaction.reply({ content: 'Alleen de eigenaar kan mensen verwijderen.', flags: MessageFlags.Ephemeral });
        }

        const selectRow = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId(`call_remove_select_${channelId}`)
                .setPlaceholder('Kies een lid om te verwijderen')
                .setMinValues(1)
                .setMaxValues(1)
        );
        return interaction.reply({ content: 'Kies een lid om te verwijderen:', components: [selectRow], flags: MessageFlags.Ephemeral });
    }

    if (interaction.customId.startsWith('call_hide_')) {
        try {
            await interaction.update({ content: '🙈 Bericht verborgen. Je kan de knoppen in het call-kanaal gebruiken, of via **Kantoor** opnieuw openen.', embeds: [], components: [] });
        } catch (err) {}
        return;
    }

    if (interaction.customId.startsWith('call_delete_')) {
        const channelId = interaction.customId.replace('call_delete_', '');
        const call = activeCalls.get(channelId);
        if (!call) {
            return interaction.reply({ content: 'Deze call bestaat niet meer.', flags: MessageFlags.Ephemeral });
        }
        if (interaction.user.id !== call.ownerId) {
            return interaction.reply({ content: 'Alleen de eigenaar kan de call verwijderen.', flags: MessageFlags.Ephemeral });
        }

        try {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (channel) await channel.delete('Eigenaar heeft de call verwijderd').catch(() => {});
        } catch (err) {
            console.error('Fout bij verwijderen call:', err);
        }
        activeCalls.delete(channelId);
        callAllowed.delete(channelId);
        callInfoMessages.delete(channelId);

        try {
            await interaction.update({ content: '🗑️ Call verwijderd.', embeds: [], components: [] });
        } catch (err) {}

        await sendLog(interaction.guild, CONFIG.CALL_LOG_ID, {
            title: '🗑️ Call verwijderd',
            description: `**Eigenaar:** <@${call.ownerId}>\n**Kanaal:** <#${channelId}>`,
            color: PURPLE.dark
        });
        return;
    }

    if (interaction.customId === CONFIG.VERIFY_BUTTON_ID) {
        try {
            const role = interaction.guild.roles.cache.get(CONFIG.VERIFY_ROLE_ID);
            if (!role) {
                return interaction.reply({ content: 'De verify rol is niet gevonden.', flags: MessageFlags.Ephemeral });
            }
            if (interaction.member.roles.cache.has(CONFIG.VERIFY_ROLE_ID)) {
                return interaction.reply({ content: 'Je bent al geverifieerd!', flags: MessageFlags.Ephemeral });
            }
            await interaction.member.roles.add(role);
            const newCount = await countRoleMembers(interaction.guild, CONFIG.VERIFY_ROLE_ID, true);
            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(CONFIG.VERIFY_BUTTON_ID)
                    .setLabel(`${newCount}`)
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success)
            );
            await interaction.message.edit({ components: [newRow] }).catch(() => {});
            await interaction.reply({ content: 'Je bent geverifieerd! Welkom bij Familie Snus.', flags: MessageFlags.Ephemeral });
        } catch (err) {
            console.error('Fout bij verify:', err);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Er ging iets mis.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
        return;
    }

    if (interaction.customId === CONFIG.SNAP_BUTTON_ID) {
        try {
            const role = interaction.guild.roles.cache.get(CONFIG.SNAP_ROLE_ID);
            if (!role) {
                return interaction.reply({ content: 'De Snapchat Ping rol is niet gevonden.', flags: MessageFlags.Ephemeral });
            }
            if (interaction.member.roles.cache.has(CONFIG.SNAP_ROLE_ID)) {
                return interaction.reply({ content: 'Je hebt de Snapchat Ping rol al!', flags: MessageFlags.Ephemeral });
            }
            await interaction.member.roles.add(role);
            const newCount = await countRoleMembers(interaction.guild, CONFIG.SNAP_ROLE_ID, true);
            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(CONFIG.SNAP_BUTTON_ID)
                    .setLabel(`${newCount}`)
                    .setEmoji('👻')
                    .setStyle(ButtonStyle.Primary)
            );
            await interaction.message.edit({ components: [newRow] }).catch(() => {});
            await interaction.reply({ content: 'Je hebt de Snapchat Ping rol gekregen.', flags: MessageFlags.Ephemeral });
        } catch (err) {
            console.error('Fout bij snapchat:', err);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Er ging iets mis.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
    }
});

client.on('error', (err) => {
    console.error('Client error:', err);
});

client.login(CONFIG.TOKEN);
