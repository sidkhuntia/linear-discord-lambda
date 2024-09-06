import { createHmac } from 'crypto';

interface SignatureCheckResult {
    isValid: boolean;
    error?: string;
}

export const checkSignature = (
    requestHeaderSignature: string,
    rawBody: string,
    secretToken?: string
): SignatureCheckResult => {
    if (!secretToken) {
        return {
            isValid: false,
            error: 'Missing secret token',
        };
    }

    try {
        const computedSignature = createHmac('sha256', secretToken)
            .update(rawBody)
            .digest('hex');

        if (computedSignature !== requestHeaderSignature) {
            return {
                isValid: false,
                error: 'Invalid signature',
            };
        }

        return {
            isValid: true,
        };
    } catch (error) {
        return {
            isValid: false,
            error: `Signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
};