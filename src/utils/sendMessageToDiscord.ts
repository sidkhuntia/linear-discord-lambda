import { MessageEmbed } from 'discord.js';
import { z, ZodError } from 'zod';

const WEBHOOK_USERNAME = 'Linear';
const WEBHOOK_AVATAR_URL = 'https://ldw.screfy.com/static/linear.png';

// Validate environment variables
const ENV_SCHEMA = z.object({
    DISCORD_WEBHOOKS_URL: z.string(),
});

interface WebhookOptions {
    webhookUrl?: string;
    username?: string;
    avatarUrl?: string;
    embed: MessageEmbed;
}

export async function sendDiscordWebhook({
    webhookUrl = "",
    username = WEBHOOK_USERNAME,
    avatarUrl = WEBHOOK_AVATAR_URL,
    embed
}: WebhookOptions): Promise<void> {
    const env = ENV_SCHEMA.parse(process.env);
    webhookUrl = env.DISCORD_WEBHOOKS_URL;

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                avatar_url: avatarUrl,
                embeds: [embed.toJSON()]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('Discord webhook sent successfully');
    } catch (error) {
        console.error('Error sending Discord webhook:', error);
        throw error;
    }
}