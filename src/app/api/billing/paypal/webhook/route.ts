import { NextRequest, NextResponse } from 'next/server';
import { syncPremiumStatusByPayPalSubscription } from '@/lib/billing';
import { verifyPayPalWebhookSignature } from '@/lib/paypal';

function getHeader(req: NextRequest, key: string): string | undefined {
    return req.headers.get(key) || undefined;
}

function toStringOrUndefined(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

export async function POST(req: NextRequest) {
    const webhookEvent = await req.json();

    const verification = await verifyPayPalWebhookSignature({
        authAlgo: getHeader(req, 'paypal-auth-algo'),
        certUrl: getHeader(req, 'paypal-cert-url'),
        transmissionId: getHeader(req, 'paypal-transmission-id'),
        transmissionSig: getHeader(req, 'paypal-transmission-sig'),
        transmissionTime: getHeader(req, 'paypal-transmission-time'),
        webhookEvent,
    });

    if (!verification.ok) {
        console.error('PayPal webhook verification failed:', verification.reason);
        return NextResponse.json({ error: 'invalid webhook signature' }, { status: 400 });
    }

    const resource = (webhookEvent?.resource || {}) as Record<string, unknown>;
    const subscriptionId = toStringOrUndefined(resource.id);
    if (!subscriptionId) {
        return NextResponse.json({ ok: true });
    }

    await syncPremiumStatusByPayPalSubscription({
        subscriptionId,
        status: toStringOrUndefined(resource.status),
        ownerKey: toStringOrUndefined(resource.custom_id),
        planId: toStringOrUndefined(resource.plan_id),
        payerId: toStringOrUndefined((resource.subscriber as any)?.payer_id),
    });

    return NextResponse.json({ ok: true });
}

