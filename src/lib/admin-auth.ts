import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';

export const ADMIN_SESSION_COOKIE = 'admin_session';

function sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
}

export function createAdminSessionValue(token: string): string {
    return sha256(token);
}

export function isValidAdminSession(sessionValue: string | undefined, adminToken: string | undefined): boolean {
    if (!sessionValue || !adminToken) {
        return false;
    }

    const expected = sha256(adminToken);
    const left = Buffer.from(sessionValue);
    const right = Buffer.from(expected);

    if (left.length !== right.length) {
        return false;
    }

    return timingSafeEqual(left, right);
}

export function hasAdminSessionFromRequest(req: NextRequest): boolean {
    const sessionValue = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const adminToken = process.env.ADMIN_TOKEN?.trim();
    return isValidAdminSession(sessionValue, adminToken);
}
