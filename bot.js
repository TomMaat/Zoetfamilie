const http = require('http');
const fs = require('fs');
const path = require('path');
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
    TextInputStyle
} = require('discord.js');

// --- KLEINE HTTP SERVER ZODAT RENDER EEN POORT ZIET ---
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Familie Zoet bot is online');
}).listen(PORT, () => {
    console.log(`HTTP server luistert op poort ${PORT}`);
});

// --- INSTELLINGEN ---
const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN,
    SERVER_NAME: 'Familie Zoet',
    LOGO_URL: 'https://cdn.discordapp.com/attachments/1559589352185528421/1567249653492351066/Zoet.png?ex=6aeb7e7b&is=6aea2cfb&hm=7f4e899aec06642e8509c44999dd0368c84e56983cc0bbc1b0cc69f57470b62d&',

    WELCOME_CHANNEL_ID: '1567280566041190410',

    VERIFY_CHANNEL_ID: '1567280670915436705',
    VERIFY_ROLE_ID: '1554510750092099690',
    VERIFY_BUTTON_ID: 'verify_click',

    SNAP_CHANNEL_ID: '1567284467347751042',
    SNAP_ROLE_ID: '1559951158951419954',
    SNAP_BUTTON_ID: 'snap_ping_click',

    HONEYPOT_CHANNEL_ID: '1567295355740229733',

    LOG_CHANNEL_ID: '1567299300436746310',

    CALL_CHANNEL_ID: '1567542253633933402',
    CALL_CATEGORY_ID: '1567297941146829040',

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

const KICK_FILE = path.join(__dirname, 'kicks.json');
const ANTINUKE_FILE = path.join(__dirname, 'antinuke.json');

function loadJson(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return fallback;
    }
}

function saveJson(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`Kon ${file} niet opslaan:`, err);
    }
}

let kickData = loadJson(KICK_FILE, { total: 0 });

let antinukeData = loadJson(ANTINUKE_FILE, { enabled: true });
if (typeof antinukeData.enabled !== 'boolean') antinukeData.enabled = true;
saveJson(ANTINUKE_FILE, antinukeData);

const actionTracker = new Map();

// Actieve calls: channelId -> { ownerId, isPrivate, guildId }
const activeCalls = new Map();
// Toegelaten users per call: channelId -> Set<userId>
const callAllowed = new Map();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel, Partials.Message]
});

// --- FONT HELPER ---
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

// --- HELPERS ---
async function countRoleMembers(guild, roleId) {
    try {
        await guild.members.fetch();
    } catch (err) {
        console.error('Fout bij members fetch:', err);
    }
    const role = guild.roles.cache.get(roleId);
    if (!role) return 0;
    return role.members.size;
}

async function cleanupOldPanels(channel, markerText) {
    try {
        const messages = await channel.messages.fetch({ limit: 50 });
        const old = messages.filter(m =>
            m.author.id === client.user.id &&
            m.embeds.length > 0 &&
            m.embeds[0].description &&
            m.embeds[0].description.includes(markerText)
        );
        for (const msg of old.values()) {
            await msg.delete().catch(() => {});
        }
    } catch (err) {
        console.error('Fout bij opruimen oude panels:', err);
    }
}

async function clearChannel(channel) {
    try {
        let fetched;
        do {
            fetched = await channel.messages.fetch({ limit: 100 });
            if (fetched.size === 0) break;
            for (const msg of fetched.values()) {
                await msg.delete().catch(() => {});
            }
        } while (fetched.size > 0);
    } catch (err) {
        console.error('Fout bij leegmaken kanaal:', err);
    }
}

function updateStatus(guild) {
    if (!guild) return;
    client.user.setActivity(`${guild.memberCount} leden`, { type: ActivityType.Watching });
}

async function refreshPanel(channelId, buttonId, emoji, style, roleId) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;
        const messages = await channel.messages.fetch({ limit: 20 });
        const panel = messages.find(m =>
            m.author.id === client.user.id &&
            m.components.length > 0 &&
            m.components[0].components.some(b => b.customId === buttonId)
        );
        if (!panel) return;

        const count = await countRoleMembers(channel.guild, roleId);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(buttonId)
                .setLabel(`${count}`)
                .setEmoji(emoji)
                .setStyle(style)
        );
        await panel.edit({ components: [row] }).catch(() => {});
    } catch (err) {
        console.error('Fout bij refresh panel:', err);
    }
}

async function sendLog(guild, { title, description, color, thumbnail }) {
    try {
        const channel = guild.channels.cache.get(CONFIG.LOG_CHANNEL_ID);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp();

        if (thumbnail) embed.setThumbnail(thumbnail);
        else embed.setThumbnail(CONFIG.LOGO_URL);

        await channel.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {
        console.error('Fout bij sturen log:', err);
    }
}

// Zet de categorie-rechten goed zodat niet-geverifieerden geen calls zien
async function setupCallCategory(guild) {
    try {
        const category = guild.channels.cache.get(CONFIG.CALL_CATEGORY_ID);
        if (!category) {
            console.log('Call categorie niet gevonden');
            return;
        }

        await category.permissionOverwrites.set([
            {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: CONFIG.VERIFY_ROLE_ID,
                allow: [PermissionFlagsBits.ViewChannel]
            }
        ]);
        console.log('Call categorie rechten ingesteld');
    } catch (err) {
        console.error('Fout bij instellen call categorie:', err);
    }
}

// Bouwt de honeypot waarschuwingsembed met het actuele kick-totaal
function buildHoneypotEmbed() {
    return new EmbedBuilder()
        .setTitle('🍯 Dit is een honeypot kanaal!')
        .setDescription(
            '⚡ **Actie:** KICK\n\n' +
            '**PLAATS HIER NIETS** - Elk bericht, elke afbeelding, bijlage of sticker die hier geplaatst wordt, zorgt ervoor dat je **direct** gekickt wordt. Geen uitzonderingen!\n\n' +
            `**Totaal aantal kicks:** ${kickData.total}\n\n` +
            '🛡️ **Dit kanaal wordt 24/7 automatisch gecontroleerd**'
        )
        .setColor('#f7c948')
        .setThumbnail(CONFIG.LOGO_URL);
}

async function refreshHoneypotEmbed(channel) {
    try {
        const messages = await channel.messages.fetch({ limit: 50 });
        const panel = messages.find(m =>
            m.author.id === client.user.id &&
            m.embeds.length > 0 &&
            m.embeds[0].description &&
            m.embeds[0].description.includes('honeypot kanaal')
        );
        if (!panel) return;
        await panel.edit({ embeds: [buildHoneypotEmbed()] }).catch(() => {});
    } catch (err) {
        console.error('Fout bij updaten honeypot embed:', err);
    }
}

// --- ANTI-NUKE ---
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
        console.error('Fout bij audit logs:', err);
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

        await sendLog(guild, {
            title: '🚨 Anti-nuke actie',
            description: `**Gebruiker:** ${member.user.tag} (\`${member.id}\`)\n**Reden:** ${reason}`,
            color: '#e74c3c',
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

// --- CALL PANEL ---
function buildCallPanel() {
    const embed = new EmbedBuilder()
        .setTitle('🔊 Calls')
        .setDescription(
            'Maak een call aan met de knop hieronder.\n\n' +
            '**Openbaar** — iedereen met verify kan joinen.\n' +
            '**Privé** — alleen jij kan mensen toelaten.'
        )
        .setColor('#5865f2')
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
            .setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [row] };
}

async function handleCallPanelButton(interaction) {
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
    await interaction.showModal(modal);
}

// Maakt het call-kanaal aan en stuurt het info-bericht
async function createCall(interaction, name, isPrivate) {
    const guild = interaction.guild;
    const member = interaction.member;
    const verifyRole = guild.roles.cache.get(CONFIG.VERIFY_ROLE_ID);

    const prefix = isPrivate ? '🔒︱' : '🔊︱';
    const channelName = `${prefix}${toFont(name)}`;

    // Rechten
    const overwrites = [
        {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
        },
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
        guildId: guild.id
    });
    callAllowed.set(channel.id, new Set([member.id]));

    // Info-embed in het call-kanaal
    const embed = new EmbedBuilder()
        .setTitle(isPrivate ? '🔒 Privé call' : '🔊 Openbare call')
        .setDescription(
            `**Eigenaar:** ${member}\n` +
            `**Type:** ${isPrivate ? 'Privé' : 'Openbaar'}\n\n` +
            (isPrivate
                ? 'Deze call is privé. Alleen de eigenaar kan mensen toelaten via de knop hieronder.'
                : 'Deze call is openbaar. Iedereen met verify kan joinen.')
        )
        .setColor(isPrivate ? '#e74c3c' : '#2ecc71')
        .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL });

    const components = [];
    if (isPrivate) {
        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`call_allow_${channel.id}`)
                    .setLabel('Iemand toelaten')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success)
            )
        );
    }

    await channel.send({
        content: `<@${member.id}>`,
        embeds: [embed],
        components
    }).catch(() => {});

    await interaction.reply({
        content: `Je call is aangemaakt: <#${channel.id}>`,
        flags: MessageFlags.Ephemeral
    });

    // Log
    await sendLog(guild, {
        title: isPrivate ? '🔒 Privé call gemaakt' : '🔊 Openbare call gemaakt',
        description: `**Eigenaar:** ${member.user.tag} (\`${member.id}\`)\n**Kanaal:** <#${channel.id}>`,
        color: isPrivate ? '#e74c3c' : '#2ecc71',
        thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
    });
}

// --- BOT ONLINE ---
client.once('clientReady', async () => {
    console.log(`Ingelogd als ${client.user.tag}`);
    console.log(`Anti-nuke: ${antinukeData.enabled ? 'AAN' : 'UIT'}`);

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
                )
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
            await cleanupOldPanels(verifyChannel, 'Welkom bij Familie Zoet');

            const verifyCount = await countRoleMembers(verifyChannel.guild, CONFIG.VERIFY_ROLE_ID);

            const embed = new EmbedBuilder()
                .setTitle('Familie Zoet Verification')
                .setDescription('Welkom bij Familie Zoet!\n\nKlik op de knop hieronder om jezelf te verifiëren en toegang te krijgen tot de server.')
                .setColor('#2b2d31')
                .setThumbnail(CONFIG.LOGO_URL);

            const button = new ButtonBuilder()
                .setCustomId(CONFIG.VERIFY_BUTTON_ID)
                .setLabel(`${verifyCount}`)
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(button);
            await verifyChannel.send({ embeds: [embed], components: [row] });
            console.log(`Verify panel gestuurd (${verifyCount} geverifieerd)`);
        }
    } catch (err) {
        console.error('Fout bij verify panel:', err);
    }

    // Snapchat panel
    try {
        const snapChannel = await client.channels.fetch(CONFIG.SNAP_CHANNEL_ID);
        if (snapChannel) {
            await cleanupOldPanels(snapChannel, 'Snapchat Ping');

            const snapCount = await countRoleMembers(snapChannel.guild, CONFIG.SNAP_ROLE_ID);

            const embed = new EmbedBuilder()
                .setTitle('Snapchat Ping')
                .setDescription(
                    'Klik op de knop hieronder om de **Snapchat Ping** rol te krijgen.\n\n' +
                    'Je krijgt dan een ping wanneer er snaps gedropped worden.'
                )
                .setColor('#f7c948')
                .setThumbnail(CONFIG.LOGO_URL);

            const button = new ButtonBuilder()
                .setCustomId(CONFIG.SNAP_BUTTON_ID)
                .setLabel(`${snapCount}`)
                .setEmoji('👻')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(button);
            await snapChannel.send({ embeds: [embed], components: [row] });
            console.log(`Snapchat panel gestuurd (${snapCount} met rol)`);
        }
    } catch (err) {
        console.error('Fout bij snapchat panel:', err);
    }

    // Honeypot
    try {
        const honeyChannel = await client.channels.fetch(CONFIG.HONEYPOT_CHANNEL_ID);
        if (honeyChannel) {
            await clearChannel(honeyChannel);
            console.log('Honeypot kanaal leeggemaakt');

            await honeyChannel.send({ embeds: [buildHoneypotEmbed()] });
            console.log('Honeypot waarschuwing gestuurd');
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
            console.log('Call panel gestuurd');
        }
    } catch (err) {
        console.error('Fout bij call panel:', err);
    }
});

// --- WELCOME ---
client.on('guildMemberAdd', async (member) => {
    updateStatus(member.guild);

    try {
        const channel = member.guild.channels.cache.get(CONFIG.WELCOME_CHANNEL_ID);
        if (!channel) return;

        const memberCount = member.guild.memberCount;

        const embed = new EmbedBuilder()
            .setDescription(
                `Welkom ${member}!\n` +
                `Je bent lid **${memberCount}** van **${CONFIG.SERVER_NAME}**.`
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
            .setColor('#2b2d31')
            .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL });

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Fout bij welcome:', err);
    }
});

client.on('guildMemberRemove', async (member) => {
    updateStatus(member.guild);

    const hadVerify = member.roles.cache.has(CONFIG.VERIFY_ROLE_ID);
    const hadSnap = member.roles.cache.has(CONFIG.SNAP_ROLE_ID);

    if (hadVerify) {
        await refreshPanel(CONFIG.VERIFY_CHANNEL_ID, CONFIG.VERIFY_BUTTON_ID, '✅', ButtonStyle.Success, CONFIG.VERIFY_ROLE_ID);
        await sendLog(member.guild, {
            title: '❌ Verify verlaten',
            description: `${member.user.tag} (\`${member.id}\`) heeft de server verlaten en had de verify rol.`,
            color: '#e74c3c',
            thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    }

    if (hadSnap) {
        await refreshPanel(CONFIG.SNAP_CHANNEL_ID, CONFIG.SNAP_BUTTON_ID, '👻', ButtonStyle.Primary, CONFIG.SNAP_ROLE_ID);
        await sendLog(member.guild, {
            title: '❌ Snapchat Ping verlaten',
            description: `${member.user.tag} (\`${member.id}\`) heeft de server verlaten en had de Snapchat Ping rol.`,
            color: '#e74c3c',
            thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    }

    if (!antinukeData.enabled) return;
    const executor = await findExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
    if (!executor) return;
    if (executor.id === client.user.id) return;
    if (CONFIG.ANTINUKE_ALLOWED_USERS.includes(executor.id)) return;

    if (checkThreshold(executor.id, 'kickAdd')) {
        await punishUser(member.guild, executor.id, `Te veel kicks binnen ${CONFIG.ANTINUKE_WINDOW_MS / 1000}s`);
    }
});

// --- ROLLEN: ADD / REMOVE LOGS ---
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const oldVerify = oldMember.roles.cache.has(CONFIG.VERIFY_ROLE_ID);
    const newVerify = newMember.roles.cache.has(CONFIG.VERIFY_ROLE_ID);
    const oldSnap = oldMember.roles.cache.has(CONFIG.SNAP_ROLE_ID);
    const newSnap = newMember.roles.cache.has(CONFIG.SNAP_ROLE_ID);

    if (!oldVerify && newVerify) {
        await refreshPanel(CONFIG.VERIFY_CHANNEL_ID, CONFIG.VERIFY_BUTTON_ID, '✅', ButtonStyle.Success, CONFIG.VERIFY_ROLE_ID);
        await sendLog(newMember.guild, {
            title: '✅ Verify gekregen',
            description: `${newMember.user.tag} (\`${newMember.id}\`) heeft de verify rol gekregen.`,
            color: '#2ecc71',
            thumbnail: newMember.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    } else if (oldVerify && !newVerify) {
        await refreshPanel(CONFIG.VERIFY_CHANNEL_ID, CONFIG.VERIFY_BUTTON_ID, '✅', ButtonStyle.Success, CONFIG.VERIFY_ROLE_ID);
        await sendLog(newMember.guild, {
            title: '❌ Verify verwijderd',
            description: `${newMember.user.tag} (\`${newMember.id}\`) is niet meer geverifieerd.`,
            color: '#e74c3c',
            thumbnail: newMember.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    }

    if (!oldSnap && newSnap) {
        await refreshPanel(CONFIG.SNAP_CHANNEL_ID, CONFIG.SNAP_BUTTON_ID, '👻', ButtonStyle.Primary, CONFIG.SNAP_ROLE_ID);
        await sendLog(newMember.guild, {
            title: '👻 Snapchat Ping gekregen',
            description: `${newMember.user.tag} (\`${newMember.id}\`) heeft de Snapchat Ping rol gekregen.`,
            color: '#f7c948',
            thumbnail: newMember.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    } else if (oldSnap && !newSnap) {
        await refreshPanel(CONFIG.SNAP_CHANNEL_ID, CONFIG.SNAP_BUTTON_ID, '👻', ButtonStyle.Primary, CONFIG.SNAP_ROLE_ID);
        await sendLog(newMember.guild, {
            title: '❌ Snapchat Ping verwijderd',
            description: `${newMember.user.tag} (\`${newMember.id}\`) heeft de Snapchat Ping rol niet meer.`,
            color: '#e74c3c',
            thumbnail: newMember.user.displayAvatarURL({ dynamic: true, size: 128 })
        });
    }
});

// --- ANTI-NUKE EVENTS ---
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

// --- HONEYPOT ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== CONFIG.HONEYPOT_CHANNEL_ID) return;

    await message.delete().catch(() => {});

    const member = message.member;
    if (!member) return;

    try {
        await member.kick('Honeypot kanaal - bericht geplaatst');
        kickData.total += 1;
        saveJson(KICK_FILE, kickData);

        await refreshHoneypotEmbed(message.channel);

        const embed = new EmbedBuilder()
            .setTitle('🍯 Honeypot geactiveerd')
            .setDescription(
                `**Gebruiker:** ${message.author.tag} (\`${message.author.id}\`)\n` +
                `**Actie:** KICK\n` +
                `**Totaal aantal kicks:** ${kickData.total}`
            )
            .setColor('#e74c3c')
            .setTimestamp();

        await message.channel.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {
        console.error('Fout bij honeypot kick:', err);
    }
});

// --- CALL: eigenaar verlaat call -> kanaal verwijderen ---
client.on('voiceStateUpdate', async (oldState, newState) => {
    const channelId = oldState.channelId;
    if (!channelId) return;
    if (!activeCalls.has(channelId)) return;
    if (oldState.channelId === newState.channelId) return;

    const call = activeCalls.get(channelId);
    if (!call) return;
    if (oldState.id !== call.ownerId) return;

    // Eigenaar is uit de call gegaan -> verwijder kanaal
    try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (channel) await channel.delete('Call eigenaar heeft de call verlaten').catch(() => {});
    } catch (err) {
        console.error('Fout bij verwijderen call:', err);
    }

    activeCalls.delete(channelId);
    callAllowed.delete(channelId);
});

// --- INTERACTIONS ---
client.on('interactionCreate', async (interaction) => {

    // --- SLASH COMMANDS ---
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
                await interaction.reply({ content: 'Kon de berichten niet verwijderen. Berichten ouder dan 14 dagen kunnen niet verwijderd worden.', flags: MessageFlags.Ephemeral });
            }
        }

        if (interaction.commandName === 'antinuke') {
            if (!CONFIG.ANTINUKE_ALLOWED_USERS.includes(interaction
