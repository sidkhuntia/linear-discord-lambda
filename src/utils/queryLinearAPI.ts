
import { z, ZodError } from 'zod';

// Validate environment variables
const ENV_SCHEMA = z.object({
    LINEAR_TOKEN: z.string(),
});

interface GraphQLResponse {
    data?: any;
    errors?: Array<{ message: string }>;
}

async function queryLinearAPI(query: string): Promise<GraphQLResponse> {
    const env = ENV_SCHEMA.parse(process.env);
    if (!env.LINEAR_TOKEN) {
        throw new Error('LINEAR_API_KEY is not set in environment variables');
    }

    const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': env.LINEAR_TOKEN,
        },
        body: JSON.stringify({ query }),
    });



    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json() as GraphQLResponse;

    if (json.errors) {
        console.error('GraphQL Errors:', json.errors);
        throw new Error('GraphQL query failed');
    }

    return json;
}

export default queryLinearAPI;