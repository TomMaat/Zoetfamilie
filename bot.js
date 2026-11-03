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
    AuditLogEvent
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

// Anti-nuke standaard AAN. Alleen als het bestand expliciet false bevat, blijft het uit.
let antinukeData = loadJson(ANTINUKE_FILE, { enabled: true });
if (typeof antinukeData.enabled !== 'boolean') antinukeData.enabled = true;
saveJson(ANTINUKE_FILE, antinukeData);

const actionTracker = new Map();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ],
    partials: [Partials.Channel, Partials.Message]
});

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

// --- BOT ONLINE ---
client.once('clientReady', async () => {
    console.log(`Ingelogd als ${client.user.tag}`);
    console.log(`Anti-nuke: ${antinukeData.enabled ? 'AAN' : 'UIT'}`);

    const guild = client.guilds.cache.first();
    if (guild) updateStatus(guild);

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
                .setName('kicks')
                .setDescription('Bekijk het totaal aantal honeypot kicks')
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
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

    try {
        const honeyChannel = await client.channels.fetch(CONFIG.HONEYPOT_CHANNEL_ID);
        if (honeyChannel) {
            await clearChannel(honeyChannel);
            console.log('Honeypot kanaal leeggemaakt');

            const embed = new EmbedBuilder()
                .setTitle('🍯 Dit is een honeypot kanaal!')
                .setDescription(
                    '⚡ **Actie:** KICK\n\n' +
                    '**PLAATS HIER NIETS** - Elk bericht, elke afbeelding, bijlage of sticker die hier geplaatst wordt, zorgt ervoor dat je **direct** gekickt wordt. Geen uitzonderingen!\n\n' +
                    '🛡️ **Dit kanaal wordt 24/7 automatisch gecontroleerd**'
                )
                .setColor('#f7c948')
                .setThumbnail(CONFIG.LOGO_URL);

            await honeyChannel.send({ embeds: [embed] });
            console.log('Honeypot waarschuwing gestuurd');
        }
    } catch (err) {
        console.error('Fout bij honeypot panel:', err);
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

        const embed = new EmbedBuilder()
            .setTitle('🍯 Honeypot geactiveerd')
            .setDescription(
                `**Gebruiker:** ${message.author.tag} (\`${message.author.id}\`)\n` +
                `**Actie:** KICK\n` +
                `**Totaal kicks:** ${kickData.total}`
            )
            .setColor('#e74c3c')
            .setTimestamp();

        await message.channel.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {
        console.error('Fout bij honeypot kick:', err);
    }
});

// --- INTERACTIONS ---
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
                await interaction.reply({ content: 'Kon de berichten niet verwijderen. Berichten ouder dan 14 dagen kunnen niet verwijderd worden.', flags: MessageFlags.Ephemeral });
            }
        }

        if (interaction.commandName === 'kicks') {
            return interaction.reply({
                content: `Totaal aantal honeypot kicks: **${kickData.total}**`,
                flags: MessageFlags.Ephemeral
            });
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
                saveJson(ANTINUKE_FILE, antinukeData);
                await sendLog(interaction.guild, {
                    title: '🛡️ Anti-nuke ingeschakeld',
                    description: `Ingeschakeld door ${interaction.user.tag}.`,
                    color: '#2ecc71'
                });
                return interaction.reply({ content: 'Anti-nuke is nu **ingeschakeld**.', flags: MessageFlags.Ephemeral });
            }

            if (actie === 'disable') {
                if (!antinukeData.enabled) {
                    return interaction.reply({ content: 'Anti-nuke is al uitgeschakeld.', flags: MessageFlags.Ephemeral });
                }
                antinukeData.enabled = false;
                saveJson(ANTINUKE_FILE, antinukeData);
                await sendLog(interaction.guild, {
                    title: '🛡️ Anti-nuke uitgeschakeld',
                    description: `Uitgeschakeld door ${interaction.user.tag}.`,
                    color: '#e74c3c'
                });
                return interaction.reply({ content: 'Anti-nuke is nu **uitgeschakeld**.', flags: MessageFlags.Ephemeral });
            }
        }
        return;
    }

    if (!interaction.isButton()) return;

    if (interaction.customId === CONFIG.VERIFY_BUTTON_ID) {
        try {
            const role = interaction.guild.roles.cache.get(CONFIG.VERIFY_ROLE_ID);
            if (!role) {
                return interaction.reply({ content: 'De verify rol is niet gevonden. Neem contact op met een admin.', flags: MessageFlags.Ephemeral });
            }

            if (interaction.member.roles.cache.has(CONFIG.VERIFY_ROLE_ID)) {
                return interaction.reply({ content: 'Je bent al geverifieerd!', flags: MessageFlags.Ephemeral });
            }

            await interaction.member.roles.add(role);

            const newCount = await countRoleMembers(interaction.guild, CONFIG.VERIFY_ROLE_ID);
            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(CONFIG.VERIFY_BUTTON_ID)
                    .setLabel(`${newCount}`)
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success)
            );
            await interaction.message.edit({ components: [newRow] }).catch(() => {});

            await interaction.reply({ content: 'Je bent geverifieerd! Welkom bij Familie Zoet.', flags: MessageFlags.Ephemeral });
        } catch (err) {
            console.error('Fout bij verify:', err);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Er ging iets mis. Probeer het later opnieuw.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
        return;
    }

    if (interaction.customId === CONFIG.SNAP_BUTTON_ID) {
        try {
            const role = interaction.guild.roles.cache.get(CONFIG.SNAP_ROLE_ID);
            if (!role) {
                return interaction.reply({ content: 'De Snapchat Ping rol is niet gevonden. Neem contact op met een admin.', flags: MessageFlags.Ephemeral });
            }

            if (interaction.member.roles.cache.has(CONFIG.SNAP_ROLE_ID)) {
                return interaction.reply({ content: 'Je hebt de Snapchat Ping rol al!', flags: MessageFlags.Ephemeral });
            }

            await interaction.member.roles.add(role);

            const newCount = await countRoleMembers(interaction.guild, CONFIG.SNAP_ROLE_ID);
            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(CONFIG.SNAP_BUTTON_ID)
                    .setLabel(`${newCount}`)
                    .setEmoji('👻')
                    .setStyle(ButtonStyle.Primary)
            );
            await interaction.message.edit({ components: [newRow] }).catch(() => {});

            await interaction.reply({ content: 'Je hebt de Snapchat Ping rol gekregen. Je krijgt nu een ping als er snaps gedropped worden.', flags: MessageFlags.Ephemeral });
        } catch (err) {
            console.error('Fout bij snapchat ping:', err);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Er ging iets mis. Probeer het later opnieuw.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
    }
});

client.on('error', (err) => {
    console.error('Client error:', err);
});

// --- LOGIN ---
client.login(CONFIG.TOKEN);
