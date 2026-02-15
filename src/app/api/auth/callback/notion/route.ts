import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPublicBaseUrl } from '@/lib/public-url';
import { createNotionUserSessionValue, NOTION_USER_SESSION_COOKIE } from '@/lib/notion-user-session';

type OwnerContext = {
    ownerKey?: string;
    ownerUserId?: string;
    ownerUserName?: string;
    workspaceId?: string;
    workspaceName?: string;
    workspaceIcon?: string;
};

function getStringOrUndefined(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
}

function buildOwnerContext(data: any): OwnerContext {
    const botId = getStringOrUndefined(data?.bot_id);
    const workspaceId = getStringOrUndefined(data?.workspace_id);
    const workspaceName = getStringOrUndefined(data?.workspace_name);
    const workspaceIcon = getStringOrUndefined(data?.workspace_icon);
    const ownerUserId = getStringOrUndefined(data?.owner?.user?.id);
    const ownerUserName = getStringOrUndefined(data?.owner?.user?.name);

    const ownerKey = ownerUserId
        ? `user:${ownerUserId}`
        : workspaceId
            ? `workspace:${workspaceId}`
            : botId
                ? `bot:${botId}`
                : undefined;

    return {
        ownerKey,
        ownerUserId,
        ownerUserName,
        workspaceId,
        workspaceName,
        workspaceIcon,
    };
}

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get('code');
    const error = req.nextUrl.searchParams.get('error');
    const mode = req.nextUrl.searchParams.get('state') === 'login' ? 'login' : 'connect';

    if (error) {
        return NextResponse.json({ error }, { status: 400 });
    }

    if (!code) {
        return NextResponse.json({ error: 'Missing auth code' }, { status: 400 });
    }

    try {
        const clientId = process.env.NOTION_CLIENT_ID;
        const clientSecret = process.env.NOTION_CLIENT_SECRET;
        const redirectUri = process.env.NOTION_REDIRECT_URI;

        if (!clientId || !clientSecret || !redirectUri) {
            throw new Error('Missing environment variables');
        }

        // Exchange code for token
        const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const response = await fetch('https://api.notion.com/v1/oauth/token', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Basic ${encoded}`,
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Notion token exchange failed:', errorText);
            return NextResponse.json({ error: 'Failed to exchange token', details: errorText }, { status: response.status });
        }

        const data = await response.json();
        const accessToken = data.access_token as string | undefined;
        const botId = data.bot_id as string | undefined;
        const ownerContext = buildOwnerContext(data);
        const baseUrl = getPublicBaseUrl(req);

        if (!accessToken) {
            return NextResponse.json({ error: 'Notion did not return access token' }, { status: 502 });
        }

        // Backfill legacy rows that were created before owner fields existed.
        if (ownerContext.ownerKey && botId) {
            await prisma.feed.updateMany({
                where: {
                    botId,
                    ownerKey: null,
                },
                data: {
                    ownerKey: ownerContext.ownerKey,
                    ownerUserId: ownerContext.ownerUserId,
                    ownerUserName: ownerContext.ownerUserName,
                    workspaceId: ownerContext.workspaceId,
                    workspaceName: ownerContext.workspaceName,
                    workspaceIcon: ownerContext.workspaceIcon,
                },
            });
        }

        const sessionValue = ownerContext.ownerKey
            ? createNotionUserSessionValue({
                ownerKey: ownerContext.ownerKey,
                ownerUserId: ownerContext.ownerUserId,
                ownerUserName: ownerContext.ownerUserName,
                workspaceId: ownerContext.workspaceId,
                workspaceName: ownerContext.workspaceName,
                workspaceIcon: ownerContext.workspaceIcon,
            })
            : null;

        if (mode === 'login') {
            const loginResponse = NextResponse.redirect(`${baseUrl}/my`, { status: 303 });
            if (sessionValue) {
                loginResponse.cookies.set({
                    name: NOTION_USER_SESSION_COOKIE,
                    value: sessionValue,
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 60 * 60 * 24 * 30,
                });
            }
            return loginResponse;
        }

        // Create feed for connect flow.
        const feed = await prisma.feed.create({
            data: {
                accessToken,
                botId,
                displayName: ownerContext.workspaceName || ownerContext.ownerUserName || 'Notion Calendar',
                databaseId: '',
                properties: '{}',
                ownerKey: ownerContext.ownerKey,
                ownerUserId: ownerContext.ownerUserId,
                ownerUserName: ownerContext.ownerUserName,
                workspaceId: ownerContext.workspaceId,
                workspaceName: ownerContext.workspaceName,
                workspaceIcon: ownerContext.workspaceIcon,
            },
        });

        const connectResponse = NextResponse.redirect(`${baseUrl}/config/${feed.id}`, { status: 303 });
        if (sessionValue) {
            connectResponse.cookies.set({
                name: NOTION_USER_SESSION_COOKIE,
                value: sessionValue,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 30,
            });
        }
        return connectResponse;

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
