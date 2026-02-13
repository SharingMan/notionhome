import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Client } from '@notionhq/client';
import ConfigForm from './ConfigForm';

export default async function ConfigPage({ params }: { params: { feedId: string } }) {
    const feed = await prisma.feed.findUnique({
        where: { id: params.feedId },
    });

    if (!feed) {
        notFound();
    }

    const notion = new Client({ auth: feed.accessToken });
    let databases = [];
    try {
        const response = await notion.search({
            filter: { value: 'database', property: 'object' } as any,
            sort: { direction: 'descending', timestamp: 'last_edited_time' },
        });
        databases = response.results;
    } catch (error) {
        console.error('Error fetching databases:', error);
        return <div>Error connecting to Notion. Please try again.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white shadow-xl rounded-lg max-w-2xl w-full p-8">
                <h1 className="text-3xl font-bold mb-6 text-gray-900">Configure Calendar Sync</h1>
                <p className="text-gray-600 mb-8">Select the Notion database you want to sync with Apple Calendar.</p>

                <ConfigForm feed={feed} databases={databases} />
            </div>
        </div>
    );
}
