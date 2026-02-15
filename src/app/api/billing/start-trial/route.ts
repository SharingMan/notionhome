import { NextRequest, NextResponse } from 'next/server';
import { getPublicBaseUrl } from '@/lib/public-url';
import { getNotionUserSessionFromRequest } from '@/lib/my-session';
import { startTrialForOwner } from '@/lib/billing';

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

    const result = await startTrialForOwner(session.ownerKey);
    if (!result.ok) {
        return redirect(req, { error: result.reason });
    }

    return redirect(req, { status: 'trial_started' });
}

