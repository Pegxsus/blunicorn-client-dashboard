/**
 * Shared Razorpay utility functions for Edge Functions
 * Provides type-safe wrappers for Razorpay API operations
 */

export interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: string;
    attempts: number;
    notes: Record<string, string>;
    created_at: number;
}

export interface RazorpayPayment {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    status: string;
    order_id: string;
    method: string;
    captured: boolean;
    email: string;
    contact: string;
    created_at: number;
}

export interface CreateOrderParams {
    amount: number; // Amount in smallest currency unit (e.g., paise for INR)
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
}

/**
 * Create a Razorpay order using the Orders API
 */
export async function createRazorpayOrder(
    params: CreateOrderParams,
    keyId: string,
    keySecret: string
): Promise<RazorpayOrder> {
    const auth = btoa(`${keyId}:${keySecret}`);

    const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Razorpay API error: ${error.error?.description || 'Unknown error'}`);
    }

    return await response.json();
}

/**
 * Verify Razorpay webhook signature
 * This is CRITICAL for security - prevents fake payment confirmations
 */
export function verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
): boolean {
    try {
        // Create HMAC SHA256 hash of the payload
        const encoder = new TextEncoder();
        const key = encoder.encode(secret);
        const data = encoder.encode(payload);

        // Use Web Crypto API for HMAC
        return crypto.subtle.importKey(
            'raw',
            key,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        ).then(cryptoKey =>
            crypto.subtle.sign('HMAC', cryptoKey, data)
        ).then(hashBuffer => {
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const generatedSignature = hashArray
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            return generatedSignature === signature;
        }).catch(() => false);
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

/**
 * Convert amount to smallest currency unit
 * Razorpay requires amounts in paise (for INR), cents (for USD), etc.
 */
export function toSmallestUnit(amount: number, currency: string): number {
    // Most currencies use 2 decimal places (100 subunits = 1 unit)
    // Exceptions: JPY, KRW (0 decimal places)
    const zeroCurrencies = ['JPY', 'KRW'];

    if (zeroCurrencies.includes(currency.toUpperCase())) {
        return Math.round(amount);
    }

    return Math.round(amount * 100);
}

/**
 * Convert amount from smallest currency unit to standard unit
 */
export function fromSmallestUnit(amount: number, currency: string): number {
    const zeroCurrencies = ['JPY', 'KRW'];

    if (zeroCurrencies.includes(currency.toUpperCase())) {
        return amount;
    }

    return amount / 100;
}
