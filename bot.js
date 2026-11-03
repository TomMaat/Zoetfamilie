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
    MessageFlags
} = require('discord.js');

// --- KLEINE HTTP SERVER ZODAT RENDER EEN POORT ZIET ---
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Zoet Family bot is online');
}).listen(PORT, () => {
    console.log(`HTTP server luistert op poort ${PORT}`);
});

// --- INSTELLINGEN ---
const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN,
    SERVER_NAME: 'Zoet Family',
    LOGO_URL: 'https://cdn.discordapp.com/attachments/1559589352185528421/1567249653492351066/Zoet.png?ex=6aeb7e7b&is=6aea2cfb&hm=7f4e899aec06642e8509c44999dd0368c84e56983cc0bbc1b0cc69f57470b62d&',

    WELCOME_CHANNEL_ID: '1567280566041190410',

    VERIFY_CHANNEL_ID: '1567280670915436705',
    VERIFY_ROLE_ID: '1554510750092099690',
    VERIFY_BUTTON_ID: 'verify_click',

    SNAP_CHANNEL_ID: '1567284467347751042',
    SNAP_ROLE_ID: '1559951158951419954',
    SNAP_BUTTON_ID: 'snap_ping_click',

    HONEYPOT_CHANNEL_ID: '1567295355740229733'
};

// Bestand voor het bijhouden van kicks (overleeft herstart via Render disk? nee, maar in-memory is ok)
const KICK_FILE = path.join(__dirname, 'kicks.json');

function loadKicks() {
    try {
        return JSON.parse(fs.readFileSync(KICK_FILE, 'utf8'));
    } catch {
        return { total: 0 };
    }
}

function saveKicks(data) {
    try {
        fs.writeFileSync(KICK_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Kon kicks niet opslaan:', err);
    }
}

let kickData = loadKicks();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
});

// --- HELPERS ---
function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

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

function updateStatus(guild) {
    if (!guild) return;
    client.user.setActivity(`${guild.memberCount} leden`, { type: ActivityType.Watching });
}

// --- BOT ONLINE ---
client.once('clientReady', async () => {
    console.log(`Ingelogd als ${client.user.tag}`);

    const guild = client.guilds.cache.first();
    if (guild) updateStatus(guild);

    // Slash commands
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
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
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
            await cleanupOldPanels(verifyChannel, 'Welkom bij Zoet Family');

            const verifyCount = await countRoleMembers(verifyChannel.guild, CONFIG.VERIFY_ROLE_ID);

            const embed = new EmbedBuilder()
                .setTitle('Zoet Family Verification')
                .setDescription('Welkom bij Zoet Family!\n\nKlik op de knop hieronder om jezelf te verifiëren en toegang te krijgen tot de server.')
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

    // Honeypot waarschuwing sturen
    try {
        const honeyChannel = await client.channels.fetch(CONFIG.HONEYPOT_CHANNEL_ID);
        if (honeyChannel) {
            await cleanupOldPanels(honeyChannel, 'This is a honeypot channel');

            const embed = new EmbedBuilder()
                .setTitle('🍯 This is a honeypot channel!')
                .setDescription(
                    '⚡ **Action taken:** KICK\n\n' +
                    '**DO NOT POST HERE** - ANY message, image, attachment or sticker posted here will get you kicked **instantly**, no exceptions!\n\n' +
                    '🛡️ **This channel is monitored automatically 24/7**'
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
            .setTitle(`Welkom bij ${CONFIG.SERVER_NAME}!`)
            .setDescription(
                `Hey ${member}, welkom bij **${CONFIG.SERVER_NAME}**!\n\n` +
                `Je bent het **${memberCount}${getOrdinal(memberCount)}** lid van de server.\n\n` +
                `Ga naar <#${CONFIG.VERIFY_CHANNEL_ID}> om jezelf te verifiëren.`
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setColor('#2b2d31')
            .setFooter({ text: CONFIG.SERVER_NAME, iconURL: CONFIG.LOGO_URL });

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Fout bij welcome:', err);
    }
});

client.on('guildMemberRemove', (member) => {
    updateStatus(member.guild);
});

// --- HONEYPOT ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== CONFIG.HONEYPOT_CHANNEL_ID) return;

    // Bericht meteen verwijderen
    await message.delete().catch(() => {});

    const member = message.member;
    if (!member) return;

    // Kick (geen ban, zoals gevraagd)
    try {
        await member.kick('Honeypot channel - posted a message');
        kickData.total += 1;
        saveKicks(kickData);

        // Melding in het honeypot kanaal
        const embed = new EmbedBuilder()
            .setTitle('🍯 Honeypot triggered')
            .setDescription(
                `**User:** ${message.author.tag} (\`${message.author.id}\`)\n` +
                `**Action:** KICK\n` +
                `**Total kicks:** ${kickData.total}`
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
        return;
    }

    if (!interaction.isButton()) return;

    // Verify knop
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

            await interaction.reply({ content: 'Je bent geverifieerd! Welkom bij Zoet Family.', flags: MessageFlags.Ephemeral });
        } catch (err) {
            console.error('Fout bij verify:', err);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Er ging iets mis. Probeer het later opnieuw.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
        return;
    }

    // Snapchat knop
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
