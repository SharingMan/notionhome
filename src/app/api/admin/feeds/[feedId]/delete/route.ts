import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { hasAdminSessionFromRequest } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { getPublicBaseUrl } from '@/lib/public-url';

function redirectToAdmin(req: NextRequest, params: Record<string, string>) {
    const url = new URL('/admin', getPublicBaseUrl(req));
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: NextRequest, context: { params: Promise<{ feedId: string }> }) {
    if (!hasAdminSessionFromRequest(req)) {
        return redirectToAdmin(req, { error: 'unauthorized' });
    }

    const { feedId } = await context.params;

    try {
        await prisma.feed.delete({ where: { id: feedId } });
        return redirectToAdmin(req, { status: 'deleted' });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return redirectToAdmin(req, { error: 'not_found' });
        }

        console.error('Admin feed delete failed:', error);
        return redirectToAdmin(req, { error: 'delete_failed' });
    }
}
