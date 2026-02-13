import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ feedId: string }> }
) {
    try {
        const { feedId } = await context.params;
        const body = await req.json();
        const { databaseId, mappings } = body;

        if (!databaseId || typeof databaseId !== 'string') {
            return NextResponse.json({ error: 'Invalid databaseId' }, { status: 400 });
        }

        if (
            !mappings ||
            typeof mappings !== 'object' ||
            typeof mappings.name !== 'string' ||
            typeof mappings.date !== 'string' ||
            (mappings.description !== undefined && typeof mappings.description !== 'string')
        ) {
            return NextResponse.json({ error: 'Invalid mappings payload' }, { status: 400 });
        }

        const feed = await prisma.feed.update({
            where: { id: feedId },
            data: {
                databaseId,
                properties: JSON.stringify(mappings),
            },
        });

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
        const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
        const url = `${normalizedBaseUrl}/api/feed/${feed.id}.ics`;

        return NextResponse.json({ url });
    } catch (error) {
        console.error('Error saving config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
