import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get('code');
    const error = req.nextUrl.searchParams.get('error');

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
        const accessToken = data.access_token;
        const botId = data.bot_id;
        const workspaceId = data.workspace_id;

        // Create new Feed entry
        // We don't have user system, so each auth is new or we could check workspace?
        // Let's create a new Feed each time for simplicity in this "stateless" flow.
        // The user will configure it on the next screen.
        const feed = await prisma.feed.create({
            data: {
                accessToken: accessToken,
                botId: botId,
                databaseId: '', // Will be set in next step
                properties: '{}',
            },
        });

        // Redirect to config page
        return NextResponse.redirect(new URL(`/config/${feed.id}`, req.url));

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
