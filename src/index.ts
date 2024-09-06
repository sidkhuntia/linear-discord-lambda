import { APIGatewayProxyHandler } from 'aws-lambda';
import { LinearClient } from '@linear/sdk';
import { MessageEmbed } from 'discord.js';
import { z, ZodError } from 'zod';
import { HttpError } from './lib/HttpError';
import { SCHEMA } from './lib/schema';
import { Action, Model } from './lib/schema/utils';
import { checkSignature } from './utils/securityChecker';

const WEBHOOK_USERNAME = 'Linear';
const WEBHOOK_AVATAR_URL = 'https://ldw.screfy.com/static/linear.png';

const LINEAR_BASE_URL = 'https://linear.app';
const LINEAR_COLOR = '#5E6AD2';
const LINEAR_TRUSTED_IPS = z.enum(['35.231.147.226', '35.243.134.228', '34.38.87.206', '34.140.253.14']);

// Validate environment variables
const ENV_SCHEMA = z.object({
	DISCORD_WEBHOOKS_URL: z.string(),
	LINEAR_TOKEN: z.string(),
	LINEAR_SECRET: z.string()
});

function parseIdentifier(url: string) {
	return url.split('/')[5].split('#')[0];
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
	console.log('Lambda function invoked with event:', JSON.stringify(event));

	try {
		// Validate environment variables
		const env = ENV_SCHEMA.parse(process.env);
		console.log('Environment variables validated successfully');

		// Validate Linear signature
		const signature = event.headers['Linear-Signature'] || '';
		const checkResult = checkSignature(signature, event.body || '', env.LINEAR_SECRET);

		if (!checkResult.isValid) {
			console.log('Invalid Linear signature:', checkResult.error);
			throw new HttpError(checkResult.error || 'Invalid signature.', 403);
		}


		const forwardedFor = event.headers['X-Forwarded-For'] || '';
		console.log('Forwarded-For IP:', forwardedFor);

		// Allow only `POST` method:
		if (event.httpMethod !== 'POST') {
			console.log(`Invalid HTTP method: ${event.httpMethod}`);
			throw new HttpError(`Method ${event.httpMethod} is not allowed.`, 405);
		}

		// Make sure a request is truly sent from Linear:
		const { success } = LINEAR_TRUSTED_IPS.safeParse(forwardedFor.split(',')[0]);

		if (process.env.NODE_ENV !== 'development' && !success) {
			console.log(`Unauthorized IP address: ${forwardedFor}`);
			throw new HttpError(
				`Request from IP address ${forwardedFor} is not allowed.`,
				403
			);
		}

		const result = SCHEMA.safeParse(JSON.parse(event.body || '{}'));
		console.log('Parsed event body:', JSON.stringify(result));

		// Prevent Linear repeating requests for not supported resources:
		if (!result.success) {
			console.log('Unsupported event type, skipping');
			return {
				statusCode: 200,
				body: JSON.stringify({
					success: true,
					message: 'Event skipped.',
					error: null
				})
			};
		}

		const body = result.data;
		console.log('Processing event:', body.type, body.action);

		const embed = new MessageEmbed({
			color: LINEAR_COLOR,
			timestamp: body.createdAt
		});
		const linear = new LinearClient({ apiKey: env.LINEAR_TOKEN });

		switch (body.type) {
			case Model.ISSUE: {
				if (body.action === Action.CREATE) {
					console.log('Processing new issue creation');
					console.log('Issue creator:', body.data.creatorId);
					const creator = await linear.user(body.data.creatorId);
					const identifier = parseIdentifier(body.url);
					const teamUrl = `${LINEAR_BASE_URL}/team/${body.data.team.key}`;

					embed
						.setTitle(`${identifier} ${body.data.title}`)
						.setURL(body.url)
						.setAuthor({ name: 'New issue added' })
						.setFooter({ text: creator.name, iconURL: creator.avatarUrl })
						.addFields(
							{
								name: 'Team',
								value: `[${body.data.team.name}](${teamUrl})`,
								inline: true
							},
							{ name: 'Status', value: body.data.state.name, inline: true }
						);

					if (body.data.assignee) {
						const assignee = await linear.user(body.data.assignee.id);
						console.log('Issue assigned to:', assignee.name);

						embed.addFields({
							name: 'Assignee',
							value: `[${assignee.displayName}](${assignee.url})`,
							inline: true
						});
					}

					if (body.data.description) {
						embed.setDescription(body.data.description);
					}
				} else if (body.action === Action.UPDATE && body.updatedFrom?.stateId) {
					console.log('Processing issue status update');
					const creator = await linear.user(body.data.creatorId);
					const identifier = parseIdentifier(body.url);

					embed
						.setTitle(`${identifier} ${body.data.title}`)
						.setURL(body.url)
						.setAuthor({ name: 'Status changed' })
						.setColor(body.data.state.color as any)
						.setFooter({ text: creator.name, iconURL: creator.avatarUrl })
						.setDescription(`Status: **${body.data.state.name}**`);
				}

				break;
			}
			case Model.COMMENT: {
				if (body.action === Action.CREATE) {
					console.log('Processing new comment creation');
					const user = await linear.user(body.data.userId);
					const identifier = parseIdentifier(body.url);

					embed
						.setTitle(`${identifier} ${body.data.issue.title}`)
						.setURL(body.url)
						.setAuthor({ name: 'New comment' })
						.setFooter({ text: user.name, iconURL: user.avatarUrl })
						.setDescription(body.data.body);
				}

				break;
			}
		}

		const webhookUrl = env.DISCORD_WEBHOOKS_URL;
		console.log('Sending Discord webhook to:', webhookUrl);

		await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				username: WEBHOOK_USERNAME,
				avatar_url: WEBHOOK_AVATAR_URL,
				embeds: [embed.toJSON()]
			})
		});

		console.log('Discord webhook sent successfully');

		return {
			statusCode: 200,
			body: JSON.stringify({ success: true, message: 'OK', error: null })
		};
	} catch (e) {
		let error: string | z.ZodIssue[] = 'Something went wrong.';
		let statusCode = 500;

		if (e instanceof HttpError) {
			error = e.message;
			statusCode = e.statusCode;
		} else if (e instanceof ZodError) {
			error = e.issues;
			statusCode = 400;
		}

		console.error('Error in Lambda function:', error);

		return {
			statusCode,
			body: JSON.stringify({ success: false, message: null, error })
		};
	}
};