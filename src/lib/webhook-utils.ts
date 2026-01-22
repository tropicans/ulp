import crypto from 'crypto';

export function verifyWebhookSignature(payload: any, signature: string): boolean {
    const secret = process.env.WEBHOOK_HMAC_SECRET;
    if (!secret) {
        console.warn('[Webhook] WEBHOOK_HMAC_SECRET not configured. Skipping verification.');
        return true; // Allow in development if not set, but warning is logged
    }

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

export function createSignedWebhookRequest(payload: any) {
    const secret = process.env.WEBHOOK_HMAC_SECRET || 'dev-secret';
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

    return {
        body: payloadString,
        headers: {
            'Content-Type': 'application/json',
            'X-Signature': signature
        }
    };
}
