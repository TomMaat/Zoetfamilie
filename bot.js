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
    ActivityType
} = require('discord.js');

// --- INSTELLINGEN ---
const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN,
    SERVER_NAME: 'Zoet Family',
    LOGO_URL: 'https://cdn.discordapp.com/attachments/1559589352185528421/1567249653492351066/Zoet.png?ex=6aeb7e7b&is=6aea2cfb&hm=7f4e899aec06642e8509c44999dd0368c84e56983cc0bbc1b0cc69f57470b62d&',

    // Welcome
    WELCOME_CHANNEL_ID: '1567280566041190410',

    // Verify
    VERIFY_CHANNEL_ID: '1567280670915436705',
    VERIFY_ROLE_ID: '1554510750092099690',
    VERIFY_BUTTON_ID: 'verify_click',

    // Snapchat ping
    SNAP_CHANNEL_ID: '1567284467347751042',
    SNAP_ROLE_ID: '1559951158951419954',
    SNAP_BUTTON_ID: 'snap_ping_click'
};

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

function countRoleMembers(guild, roleId) {
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

// Update bot status met aantal leden
function updateStatus(guild) {
    if (!guild) return;
    client.user.setActivity(`${guild.memberCount} leden`, { type: ActivityType.Watching });
}

// --- BOT ONLINE ---
client.once('ready', async () => {
    console.log(`Ingelogd als ${client.user.tag}`);

    // Status zetten
    const guild = client.guilds.cache.first();
    if (guild) updateStatus(guild);

    // Slash commands registreren
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
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
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

            const verifyCount = countRoleMembers(verifyChannel.guild, CONFIG.VERIFY_ROLE_ID);

            const embed = new EmbedBuilder()
                .setTitle('Zoet Family Verification')
                .setDescription('Welkom bij Zoet Family!\n\nKlik op de knop hieronder om jezelf te verifiëren en toegang te krijgen tot de server.')
                .setColor('#2b2d31')
                .setThumbnail(CONFIG.LOGO_URL);

            const button = new ButtonBuilder()
                .setCustomId(CONFIG.VERIFY_BUTTON_ID)
                .setLabel(`✅ Verified — ${verifyCount}`)
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(button);
            await verifyChannel.send({ embeds: [embed], components: [row] });
            console.log('Verify panel gestuurd');
        }
    } catch (err) {
        console.error('Fout bij verify panel:', err);
    }

    // Snapchat ping panel
    try {
        const snapChannel = await client.channels.fetch(CONFIG.SNAP_CHANNEL_ID);
        if (snapChannel) {
            await cleanupOldPanels(snapChannel, 'Snapchat Ping');

            const snapCount = countRoleMembers(snapChannel.guild, CONFIG.SNAP_ROLE_ID);

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
                .setLabel(`👻 Snapchat Ping — ${snapCount}`)
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(button);
            await snapChannel.send({ embeds: [embed], components: [row] });
            console.log('Snapchat ping panel gestuurd');
        }
    } catch (err) {
        console.error('Fout bij snapchat panel:', err);
    }
});

// Status updaten als iemand joint of leaved
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

// --- INTERACTIONS ---
client.on('interactionCreate', async (interaction) => {

    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'clear') {
            const amount = interaction.options.getInteger('amount');

            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({ content: 'Je hebt geen toestemming om dit te doen.', ephemeral: true });
            }

            try {
                await interaction.channel.bulkDelete(amount, true);
                await interaction.reply({ content: `${amount} berichten verwijderd.`, ephemeral: true });
            } catch (err) {
                console.error('Fout bij clear:', err);
                await interaction.reply({ content: 'Kon de berichten niet verwijderen. Berichten ouder dan 14 dagen kunnen niet verwijderd worden.', ephemeral: true });
            }
        }
        return;
    }

    if (!interaction.isButton()) return;

    // Verify knop
    if (interaction.customId === CONFIG.VERIFY_BUTTON_ID) {
        try {
            const role = interaction.guild.roles.cache.get(CONFIG.VERIFY_ROLE_ID);
            if (!role) {
                return interaction.reply({ content: 'De verify rol is niet gevonden. Neem contact op met een admin.', ephemeral: true });
            }

            if (interaction.member.roles.cache.has(CONFIG.VERIFY_ROLE_ID)) {
                return interaction.reply({ content: 'Je bent al geverifieerd!', ephemeral: true });
            }

            await interaction.member.roles.add(role);

            // Update knop met nieuw aantal
            const newCount = countRoleMembers(interaction.guild, CONFIG.VERIFY_ROLE_ID);
            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(CONFIG.VERIFY_BUTTON_ID)
                    .setLabel(`✅ Verified — ${newCount}`)
                    .setStyle(ButtonStyle.Success)
            );
            await interaction.message.edit({ components: [newRow] }).catch(() => {});

            await interaction.reply({ content: 'Je bent geverifieerd! Welkom bij Zoet Family.', ephemeral: true });
        } catch (err) {
            console.error('Fout bij verify:', err);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Er ging iets mis. Probeer het later opnieuw.', ephemeral: true });
            }
        }
        return;
    }

    // Snapchat ping knop
    if (interaction.customId === CONFIG.SNAP_BUTTON_ID) {
        try {
            const role = interaction.guild.roles.cache.get(CONFIG.SNAP_ROLE_ID);
            if (!role) {
                return interaction.reply({ content: 'De Snapchat Ping rol is niet gevonden. Neem contact op met een admin.', ephemeral: true });
            }

            if (interaction.member.roles.cache.has(CONFIG.SNAP_ROLE_ID)) {
                return interaction.reply({ content: 'Je hebt de Snapchat Ping rol al!', ephemeral: true });
            }

            await interaction.member.roles.add(role);

            const newCount = countRoleMembers(interaction.guild, CONFIG.SNAP_ROLE_ID);
            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(CONFIG.SNAP_BUTTON_ID)
                    .setLabel(`👻 Snapchat Ping — ${newCount}`)
                    .setStyle(ButtonStyle.Primary)
            );
            await interaction.message.edit({ components: [newRow] }).catch(() => {});

            await interaction.reply({ content: 'Je hebt de Snapchat Ping rol gekregen. Je krijgt nu een ping als er snaps gedropped worden.', ephemeral: true });
        } catch (err) {
            console.error('Fout bij snapchat ping:', err);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Er ging iets mis. Probeer het later opnieuw.', ephemeral: true });
            }
        }
    }
});

// --- LOGIN ---
client.login(CONFIG.TOKEN);
