import { NextRequest, NextResponse } from 'next/server';
import { getPublicBaseUrl } from '@/lib/public-url';
import { getNotionUserSessionFromRequest } from '@/lib/my-session';
import { createPayPalSubscription, getConfiguredPlanId } from '@/lib/paypal';

type Cycle = 'monthly' | 'yearly';

function redirect(req: NextRequest, params: Record<string, string>) {
    const url = new URL('/pricing', getPublicBaseUrl(req));
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: NextRequest) {
    const session = getNotionUserSessionFromRequest(req);
    if (!session) {
        return redirect(req, { error: 'unauthorized' });
    }

    const formData = await req.formData();
    const cycle = (String(formData.get('cycle') || 'monthly').toLowerCase() === 'yearly' ? 'yearly' : 'monthly') as Cycle;

    try {
        const planId = getConfiguredPlanId(cycle);
        const baseUrl = getPublicBaseUrl(req);
        const returnUrl = `${baseUrl}/api/billing/paypal/return`;
        const cancelUrl = `${baseUrl}/pricing?status=paypal_canceled`;

        const created = await createPayPalSubscription({
            planId,
            customId: session.ownerKey,
            returnUrl,
            cancelUrl,
        });

        return NextResponse.redirect(created.approveUrl, { status: 303 });
    } catch (error) {
        console.error('PayPal create subscription failed:', error);
        return redirect(req, { error: 'paypal_create_failed' });
    }
}

