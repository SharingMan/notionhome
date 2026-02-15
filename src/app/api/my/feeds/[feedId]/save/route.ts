import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPublicBaseUrl } from '@/lib/public-url';
import { serializeFeedMappings } from '@/lib/feed-mapping';
import { getNotionUserSessionFromRequest } from '@/lib/my-session';

function redirect(req: NextRequest, path: string, params: Record<string, string> = {}) {
    const url = new URL(path, getPublicBaseUrl(req));
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: NextRequest, context: { params: Promise<{ feedId: string }> }) {
    const session = getNotionUserSessionFromRequest(req);
    if (!session) {
        return redirect(req, '/my', { error: 'unauthorized' });
    }

    const { feedId } = await context.params;
    const formData = await req.formData();
    const displayName = String(formData.get('displayName') || '').trim();
    const databaseId = String(formData.get('databaseId') || '').trim();
    const titleProperty = String(formData.get('titleProperty') || '').trim();
    const dateProperty = String(formData.get('dateProperty') || '').trim();
    const descriptionProperty = String(formData.get('descriptionProperty') || '').trim();

    if (!databaseId || !titleProperty || !dateProperty) {
        return redirect(req, `/my/edit/${feedId}`, { error: 'invalid_payload' });
    }

    const feed = await prisma.feed.findFirst({
        where: {
            id: feedId,
            ownerKey: session.ownerKey,
        },
        select: { id: true },
    });

    if (!feed) {
        return redirect(req, '/my', { error: 'not_found' });
    }

    await prisma.feed.update({
        where: { id: feedId },
        data: {
            displayName: displayName || null,
            databaseId,
            properties: serializeFeedMappings({
                name: titleProperty,
                date: dateProperty,
                description: descriptionProperty || undefined,
            }),
        },
    });

    return redirect(req, `/my/edit/${feedId}`, { status: 'saved' });
}

