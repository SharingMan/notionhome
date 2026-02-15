import { createHmac, timingSafeEqual } from 'crypto';

export const NOTION_USER_SESSION_COOKIE = 'notion_user_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type NotionUserSession = {
    ownerKey: string;
    ownerUserId?: string;
    ownerUserName?: string;
    workspaceId?: string;
    workspaceName?: string;
    workspaceIcon?: string;
    expiresAt: number;
};

type SessionPayloadInput = Omit<NotionUserSession, 'expiresAt'>;

function getSigningSecret(): string | null {
    const secret = process.env.NOTION_CLIENT_SECRET?.trim();
    return secret || null;
}

function base64UrlEncode(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payloadBase64: string): string | null {
    const secret = getSigningSecret();
    if (!secret) return null;
    return createHmac('sha256', secret).update(payloadBase64).digest('base64url');
}

function safeEqualText(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) return false;
    return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createNotionUserSessionValue(input: SessionPayloadInput): string | null {
    const payload: NotionUserSession = {
        ...input,
        expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };
    const payloadBase64 = base64UrlEncode(JSON.stringify(payload));
    const signature = signPayload(payloadBase64);
    if (!signature) return null;
    return `${payloadBase64}.${signature}`;
}

export function parseNotionUserSessionValue(value: string | undefined): NotionUserSession | null {
    if (!value) return null;
    const parts = value.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64, signature] = parts;
    const expectedSignature = signPayload(payloadBase64);
    if (!expectedSignature) return null;
    if (!safeEqualText(signature, expectedSignature)) return null;

    try {
        const parsed = JSON.parse(base64UrlDecode(payloadBase64)) as Partial<NotionUserSession>;
        if (!parsed || typeof parsed !== 'object') return null;
        if (typeof parsed.ownerKey !== 'string' || !parsed.ownerKey) return null;
        if (typeof parsed.expiresAt !== 'number') return null;
        if (parsed.expiresAt <= Math.floor(Date.now() / 1000)) return null;

        return {
            ownerKey: parsed.ownerKey,
            ownerUserId: typeof parsed.ownerUserId === 'string' ? parsed.ownerUserId : undefined,
            ownerUserName: typeof parsed.ownerUserName === 'string' ? parsed.ownerUserName : undefined,
            workspaceId: typeof parsed.workspaceId === 'string' ? parsed.workspaceId : undefined,
            workspaceName: typeof parsed.workspaceName === 'string' ? parsed.workspaceName : undefined,
            workspaceIcon: typeof parsed.workspaceIcon === 'string' ? parsed.workspaceIcon : undefined,
            expiresAt: parsed.expiresAt,
        };
    } catch {
        return null;
    }
}

