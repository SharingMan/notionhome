import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    req: NextRequest,
    { params }: { params: { feedId: string } }
) {
    try {
        const body = await req.json();
        const { databaseId, mappings } = body;

        const feed = await prisma.feed.update({
            where: { id: params.feedId },
            data: {
                databaseId,
                properties: JSON.stringify(mappings),
            },
        });

        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const host = req.headers.get('host');
        const url = `${protocol}://${host}/api/feed/${feed.id}.ics`;

        return NextResponse.json({ url });
    } catch (error) {
        console.error('Error saving config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
