import { NextRequest, NextResponse } from 'next/server';
import { getPublicBaseUrl } from '@/lib/public-url';
import { getNotionUserSessionFromRequest } from '@/lib/my-session';
import { activatePremiumByPayPal } from '@/lib/billing';
import { getPayPalSubscription } from '@/lib/paypal';

function redirect(req: NextRequest, params: Record<string, string>) {
    const url = new URL('/pricing', getPublicBaseUrl(req));
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    return NextResponse.redirect(url, { status: 303 });
}

export async function GET(req: NextRequest) {
    const subscriptionId =
        req.nextUrl.searchParams.get('subscription_id') ||
        req.nextUrl.searchParams.get('ba_token') ||
        '';

    if (!subscriptionId) {
        return redirect(req, { error: 'paypal_missing_subscription' });
    }

    try {
        const data = await getPayPalSubscription(subscriptionId);
        const session = getNotionUserSessionFromRequest(req);
        const ownerKeyFromPayPal = typeof data.custom_id === 'string' ? data.custom_id : undefined;
        const ownerKey = ownerKeyFromPayPal || session?.ownerKey;
        if (!ownerKey) {
            return redirect(req, { error: 'unauthorized' });
        }

        await activatePremiumByPayPal({
            ownerKey,
            subscriptionId,
            subscriptionStatus: typeof data.status === 'string' ? data.status : undefined,
            planId: typeof data.plan_id === 'string' ? data.plan_id : undefined,
            payerId: typeof data?.subscriber?.payer_id === 'string' ? data.subscriber.payer_id : undefined,
        });

        return redirect(req, { status: 'paypal_activated' });
    } catch (error) {
        console.error('PayPal return handling failed:', error);
        return redirect(req, { error: 'paypal_activate_failed' });
    }
}

