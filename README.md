# Linear to Discord Integration Lambda

This project implements an AWS Lambda function that integrates Linear with Discord. It listens for webhook events from Linear and sends notifications to a specified Discord channel.

## Features

- Processes Linear webhook events for issues and comments
- Sends formatted messages to Discord using webhooks
- Supports issue creation, status updates, and comment creation events
- Implements IP-based security checks for Linear webhooks

### Supoorted Events
- [X] Issues
- [X] Comments
- [ ] Issue attachments
- [ ] Emoji reactions
- [ ] Projects
- [ ] Project updates
- [ ] Cycles
- [ ] Labels

## Prerequisites

- Node.js (version 20.x or later)
- npm (version 8.x or later)
- AWS CLI (configured with appropriate credentials)
- An AWS account with Lambda and API Gateway access
- A Linear account with webhook capabilities
- A Discord server with webhook URL

## Installation

1. Clone the repository:
   ```
   git clone git@github.com:sidkhuntia/linear-discord-lambda.git
   cd linear-discord-lambda
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the project root with the following content:
   ```
   DISCORD_WEBHOOKS_URL=your_discord_webhook_url
   LINEAR_TOKEN=your_linear_api_token
   ```


## Building and Packaging

To build and package the Lambda function for deployment, run:

```
npm run package
```

This command will:
1. Clean the `dist` directory
2. Compile TypeScript to JavaScript
3. Install production dependencies
4. Create a `function.zip` file ready for Lambda deployment

## Deployment

1. Create a new Lambda function in the AWS Console or using the AWS CLI.

2. Upload the `function.zip` file to your Lambda function.

3. Configure environment variables in the Lambda function settings:
   - `DISCORD_WEBHOOKS_URL`
   - `LINEAR_TOKEN`

4. Set up an API Gateway trigger for your Lambda function.

5. Configure the Linear webhook to point to your API Gateway endpoint.

## Usage

Once deployed and configured:

1. The Lambda function will automatically process incoming webhook events from Linear.
2. For each relevant event (issue creation, status update, comment creation), it will send a formatted message to the specified Discord channel.
3. Monitor the CloudWatch logs for any errors or debugging information.

## Development

### Available Scripts

- `npm run build`: Compiles TypeScript to JavaScript
- `npm run package`: Builds and packages the function for deployment
- `npm run clean`: Removes the `dist` directory
- `npm run deploy -- --function-name {function_name}`: Deploys the function to AWS Lambda

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.



