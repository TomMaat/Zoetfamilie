const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// --- CONFIGURATION ---
const CONFIG = {
    // Your bot token (set this in Render Environment Variables)
    TOKEN: process.env.DISCORD_TOKEN,

    // Server name
    SERVER_NAME: 'Zoet Family',

    // Channel where welcome messages are sent
    WELCOME_CHANNEL_ID: '1567280566041190410',

    // Channel where the verify button lives
    VERIFY_CHANNEL_ID: '1567280670915436705',

    // Role given after verification
    VERIFY_ROLE_ID: '1554510750092099690',

    // Unique ID for the verify button
    VERIFY_BUTTON_ID: 'verify_click'
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

// --- BOT READY ---
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    try {
        const verifyChannel = await client.channels.fetch(CONFIG.VERIFY_CHANNEL_ID);
        if (!verifyChannel) return console.log('Verify channel not found.');

        const embed = new EmbedBuilder()
            .setTitle('Zoet Family Verification')
            .setDescription('Welcome to Zoet Family!\n\nClick the button below to verify yourself and gain access to the server.')
            .setColor('#2b2d31');

        const button = new ButtonBuilder()
            .setCustomId(CONFIG.VERIFY_BUTTON_ID)
            .setLabel('Verify')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(button);

        await verifyChannel.send({ embeds: [embed], components: [row] });
        console.log('Verification panel sent.');
    } catch (error) {
        console.error('Error sending verify panel:', error);
    }
});

// --- WELCOME MESSAGE ---
client.on('guildMemberAdd', async (member) => {
    try {
        const channel = member.guild.channels.cache.get(CONFIG.WELCOME_CHANNEL_ID);
        if (!channel) return;

        // Member count (including the new member)
        const memberCount = member.guild.memberCount;

        const embed = new EmbedBuilder()
            .setTitle(`Welcome to ${CONFIG.SERVER_NAME}!`)
            .setDescription(
                `Hey ${member}, welcome to **${CONFIG.SERVER_NAME}**!\n\n` +
                `You are the **${memberCount}${getOrdinal(memberCount)}** member to join.\n\n` +
                `Please head over to <#${CONFIG.VERIFY_CHANNEL_ID}> to verify yourself and get access.`
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setColor('#2b2d31')
            .setFooter({ text: CONFIG.SERVER_NAME });

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending welcome message:', error);
    }
});

// Helper for "1st", "2nd", "3rd", "4th"...
function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

// --- BUTTON INTERACTION ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === CONFIG.VERIFY_BUTTON_ID) {
        try {
            const role = interaction.guild.roles.cache.get(CONFIG.VERIFY_ROLE_ID);
            if (!role) {
                return interaction.reply({ content: 'The verification role was not found. Please contact an admin.', ephemeral: true });
            }

            if (interaction.member.roles.cache.has(CONFIG.VERIFY_ROLE_ID)) {
                return interaction.reply({ content: 'You are already verified!', ephemeral: true });
            }

            await interaction.member.roles.add(role);
            await interaction.reply({ content: 'You have been verified! Welcome to Zoet Family.', ephemeral: true });
        } catch (error) {
            console.error('Error during verification:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: 'There was an error verifying you. Please try again later.', ephemeral: true });
            }
        }
    }
});

// --- LOGIN ---
client.login(CONFIG.TOKEN);
