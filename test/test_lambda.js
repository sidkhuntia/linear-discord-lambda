const dotenv = require('dotenv');
const { handler } = require('../dist/index');
dotenv.config();

const event = require('./event.json');

const context = {
	awsRequestId: 'mock-request-id'
};

async function runHandler() {
	try {
		const result = await handler(event, context);
		console.log('Lambda function result:', result);
	} catch (error) {
		console.error('Error running Lambda function:', error);
	}
}

runHandler();
