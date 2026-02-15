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
    const formData = await req.formData();
    const databaseId = String(formData.get('databaseId') || '').trim();
    const name = String(formData.get('name') || '').trim();
    const date = String(formData.get('date') || '').trim();
    const descriptionRaw = String(formData.get('description') || '').trim();

    if (!databaseId || !name || !date) {
        return redirectToAdmin(req, { error: 'invalid_payload' });
    }

    const mappings: { name: string; date: string; description?: string } = { name, date };
    if (descriptionRaw) {
        mappings.description = descriptionRaw;
    }

    try {
        await prisma.feed.update({
            where: { id: feedId },
            data: {
                databaseId,
                properties: JSON.stringify(mappings),
            },
        });
        return redirectToAdmin(req, { status: 'updated' });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return redirectToAdmin(req, { error: 'not_found' });
        }

        console.error('Admin feed update failed:', error);
        return redirectToAdmin(req, { error: 'update_failed' });
    }
}
