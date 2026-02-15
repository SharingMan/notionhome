import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Client } from '@notionhq/client';
import ConfigForm from './ConfigForm';

export default async function ConfigPage(props: { params: Promise<{ feedId: string }> }) {
    const params = await props.params;
    const feed = await prisma.feed.findUnique({
        where: { id: params.feedId },
    });

    if (!feed) {
        notFound();
    }

    const notion = new Client({ auth: feed.accessToken });
    let databases = [];
    let errorDetail: string | null = null;
    try {
        const response = await notion.search({
            filter: { value: 'database', property: 'object' } as any,
            sort: { direction: 'descending', timestamp: 'last_edited_time' },
            page_size: 100,
        });
        databases = response.results;
    } catch (error) {
        console.error('Error fetching databases (filtered search):', error);
        try {
            // Fallback for API/version differences: fetch then filter client-side.
            const fallback = await notion.search({ page_size: 100 });
            databases = fallback.results.filter((item: any) => item.object === 'database');
        } catch (fallbackError) {
            console.error('Error fetching databases (fallback search):', fallbackError);
            if (fallbackError instanceof Error) {
                errorDetail = fallbackError.message;
            } else if (error instanceof Error) {
                errorDetail = error.message;
            } else {
                errorDetail = 'Unknown Notion API error';
            }
        }
    }

    if (errorDetail) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white shadow-xl rounded-lg max-w-3xl w-full p-8 space-y-4">
                    <h1 className="text-2xl font-bold text-gray-900">Error connecting to Notion</h1>
                    <p className="text-gray-700 break-words">{errorDetail}</p>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p>Checklist:</p>
                        <p>1. Confirm this integration has Read content capability.</p>
                        <p>2. Open the target database page and Share -&gt; Add connections -&gt; select your integration.</p>
                        <p>3. Re-run OAuth from the homepage to get a fresh token.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (databases.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white shadow-xl rounded-lg max-w-3xl w-full p-8 space-y-4">
                    <h1 className="text-2xl font-bold text-gray-900">No accessible databases found</h1>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p>1. In Notion, open the database page you want to sync.</p>
                        <p>2. Click Share -&gt; Add connections, then select your integration.</p>
                        <p>3. Return to homepage and run Connect Notion again.</p>
                    </div>
                </div>
            </div>
        );
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
