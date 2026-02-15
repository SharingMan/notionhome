import { NextRequest } from 'next/server';

function firstHeaderValue(value: string | null): string | undefined {
    return value?.split(',')[0]?.trim() || undefined;
}

export function getPublicBaseUrl(req: NextRequest): string {
    const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
    if (fromEnv) {
        return fromEnv;
    }

    const host = firstHeaderValue(req.headers.get('x-forwarded-host')) || firstHeaderValue(req.headers.get('host'));
    const proto = firstHeaderValue(req.headers.get('x-forwarded-proto')) || 'https';

    if (host) {
        return `${proto}://${host}`.replace(/\/$/, '');
    }

    return req.nextUrl.origin.replace(/\/$/, '');
}
