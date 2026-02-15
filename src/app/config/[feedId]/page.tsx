import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Client } from '@notionhq/client';
import ConfigForm from './ConfigForm';
import { headers } from 'next/headers';
import { detectLocaleFromHeaders, getMessages } from '@/lib/i18n';

export default async function ConfigPage(props: { params: Promise<{ feedId: string }> }) {
    const locale = detectLocaleFromHeaders(await headers());
    const t = getMessages(locale).config;

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
        const allResults: any[] = [];
        let startCursor: string | undefined;

        // Iterate through search pages because a workspace may contain far more than 100 items.
        for (let i = 0; i < 20; i++) {
            const response = await notion.search({
                sort: { direction: 'descending', timestamp: 'last_edited_time' },
                page_size: 100,
                start_cursor: startCursor,
            });

            allResults.push(...response.results);
            if (!response.has_more || !response.next_cursor) break;
            startCursor = response.next_cursor;
        }

        databases = allResults.filter((item: any) => item.object === 'database' || item.object === 'data_source');
    } catch (error) {
        console.error('Error fetching databases (search):', error);
        try {
            // Fallback for API/version differences: pull first page without sort.
            const fallback = await notion.search({ page_size: 100 });
            databases = fallback.results.filter((item: any) => item.object === 'database' || item.object === 'data_source');
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
                    <h1 className="text-2xl font-bold text-gray-900">{t.errorTitle}</h1>
                    <p className="text-gray-700 break-words">{errorDetail}</p>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p>{t.checklistTitle}</p>
                        <p>1. {t.checklist1}</p>
                        <p>2. {t.checklist2}</p>
                        <p>3. {t.checklist3}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (databases.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white shadow-xl rounded-lg max-w-3xl w-full p-8 space-y-4">
                    <h1 className="text-2xl font-bold text-gray-900">{t.emptyTitle}</h1>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p>1. {t.empty1}</p>
                        <p>2. {t.empty2}</p>
                        <p>3. {t.empty3}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white shadow-xl rounded-lg max-w-2xl w-full p-8">
                <h1 className="text-3xl font-bold mb-6 text-gray-900">{t.title}</h1>
                <p className="text-gray-600 mb-8">{t.subtitle}</p>

                <ConfigForm feed={feed} databases={databases} locale={locale} />
            </div>
        </div>
    );
}
