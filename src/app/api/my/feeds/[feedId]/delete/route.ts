import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPublicBaseUrl } from '@/lib/public-url';
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

    await prisma.feed.delete({
        where: { id: feedId },
    });

    return redirect(req, '/my', { status: 'deleted' });
}

