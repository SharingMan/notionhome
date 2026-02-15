type BillingCycle = 'monthly' | 'yearly';

type PayPalCreateSubscriptionInput = {
    planId: string;
    customId: string;
    returnUrl: string;
    cancelUrl: string;
};

function getPayPalBaseUrl(): string {
    const mode = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();
    if (mode === 'live') {
        return 'https://api-m.paypal.com';
    }
    return 'https://api-m.sandbox.paypal.com';
}

function getClientCreds() {
    const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
        throw new Error('PayPal credentials are missing');
    }
    return { clientId, clientSecret };
}

function getPlanId(cycle: BillingCycle): string | null {
    if (cycle === 'monthly') return process.env.PAYPAL_PLAN_ID_MONTHLY?.trim() || null;
    return process.env.PAYPAL_PLAN_ID_YEARLY?.trim() || null;
}

export function getConfiguredPlanId(cycle: BillingCycle): string {
    const planId = getPlanId(cycle);
    if (!planId) {
        throw new Error(`Missing PayPal plan id for ${cycle}`);
    }
    return planId;
}

export async function getPayPalAccessToken(): Promise<string> {
    const { clientId, clientSecret } = getClientCreds();
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
        cache: 'no-store',
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`PayPal OAuth failed: ${text}`);
    }

    const data = await response.json();
    const token = data.access_token as string | undefined;
    if (!token) throw new Error('PayPal OAuth did not return access_token');
    return token;
}

export async function createPayPalSubscription(input: PayPalCreateSubscriptionInput) {
    const accessToken = await getPayPalAccessToken();
    const response = await fetch(`${getPayPalBaseUrl()}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Prefer: 'return=representation',
        },
        body: JSON.stringify({
            plan_id: input.planId,
            custom_id: input.customId,
            application_context: {
                return_url: input.returnUrl,
                cancel_url: input.cancelUrl,
                user_action: 'SUBSCRIBE_NOW',
            },
        }),
        cache: 'no-store',
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`PayPal create subscription failed: ${text}`);
    }

    const data = await response.json();
    const approveUrl =
        (Array.isArray(data.links) ? data.links.find((link: any) => link?.rel === 'approve')?.href : undefined) as string | undefined;

    if (!approveUrl) {
        throw new Error('PayPal did not return approve URL');
    }

    return {
        subscriptionId: data.id as string | undefined,
        approveUrl,
    };
}

export async function getPayPalSubscription(subscriptionId: string) {
    const accessToken = await getPayPalAccessToken();
    const response = await fetch(`${getPayPalBaseUrl()}/v1/billing/subscriptions/${subscriptionId}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`PayPal get subscription failed: ${text}`);
    }

    return response.json();
}

export async function verifyPayPalWebhookSignature(args: {
    authAlgo?: string;
    certUrl?: string;
    transmissionId?: string;
    transmissionSig?: string;
    transmissionTime?: string;
    webhookEvent: any;
}) {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
    if (!webhookId) {
        return { ok: false as const, reason: 'missing_webhook_id' as const };
    }

    const accessToken = await getPayPalAccessToken();
    const response = await fetch(`${getPayPalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({
            auth_algo: args.authAlgo,
            cert_url: args.certUrl,
            transmission_id: args.transmissionId,
            transmission_sig: args.transmissionSig,
            transmission_time: args.transmissionTime,
            webhook_id: webhookId,
            webhook_event: args.webhookEvent,
        }),
        cache: 'no-store',
    });

    if (!response.ok) {
        const text = await response.text();
        return { ok: false as const, reason: `verify_failed:${text}` };
    }

    const data = await response.json();
    return { ok: data.verification_status === 'SUCCESS' as const, reason: data.verification_status as string };
}

