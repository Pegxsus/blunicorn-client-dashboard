/**
 * TypeScript declarations for Razorpay Checkout SDK
 * Documentation: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
 */

interface RazorpayOptions {
    /**
     * Your Razorpay API Key ID (public key)
     */
    key: string;

    /**
     * Razorpay Order ID created via Orders API
     */
    order_id: string;

    /**
     * Amount in smallest currency unit (paise for INR)
     */
    amount?: number;

    /**
     * Currency code (INR, USD, etc.)
     */
    currency?: string;

    /**
     * Name of your business/product
     */
    name?: string;

    /**
     * Description of the purchase
     */
    description?: string;

    /**
     * URL of your business logo
     */
    image?: string;

    /**
     * Callback function on successful payment
     */
    handler?: (response: RazorpayResponse) => void;

    /**
     * Prefill customer information
     */
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };

    /**
     * Customize Razorpay Checkout appearance
     */
    theme?: {
        color?: string;
        backdrop_color?: string;
    };

    /**
     * Modal behavior configuration
     */
    modal?: {
        /**
         * Callback when user closes the checkout modal
         */
        ondismiss?: () => void;

        /**
         * Show/hide close button
         */
        escape?: boolean;

        /**
         * Allow closing on backdrop click
         */
        backdropclose?: boolean;

        /**
         * Callback when payment fails
         */
        confirm_close?: boolean;
    };

    /**
     * Additional notes (key-value pairs)
     */
    notes?: Record<string, string>;

    /**
     * Retry configuration for failed payments
     */
    retry?: {
        enabled?: boolean;
        max_count?: number;
    };
}

interface RazorpayResponse {
    /**
     * Razorpay Payment ID
     */
    razorpay_payment_id: string;

    /**
     * Razorpay Order ID
     */
    razorpay_order_id: string;

    /**
     * Signature for payment verification (optional, for server-side verification)
     */
    razorpay_signature?: string;
}

interface RazorpayInstance {
    /**
     * Open the Razorpay Checkout modal
     */
    open(): void;

    /**
     * Close the Razorpay Checkout modal
     */
    close(): void;

    /**
     * Attach event listeners
     */
    on(event: string, handler: (response: any) => void): void;
}

interface RazorpayConstructor {
    new(options: RazorpayOptions): RazorpayInstance;
}

declare global {
    interface Window {
        /**
         * Razorpay Checkout SDK
         * Load via: https://checkout.razorpay.com/v1/checkout.js
         */
        Razorpay: RazorpayConstructor;
    }
}

export { };
