import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { createEvents, DateArray, EventAttributes } from 'ics';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_MAX_SYNC_ITEMS = 2000;
const HARD_MAX_SYNC_ITEMS = 10000;
const PAGE_SIZE_LIMIT = 100;
const MAX_PAGE_REQUESTS = 200;

type QuerySource = 'database' | 'data_source';

function getMaxSyncItems(): number {
    const raw = Number(process.env.NOTION_SYNC_MAX_ITEMS);
    if (!Number.isFinite(raw) || raw <= 0) {
        return DEFAULT_MAX_SYNC_ITEMS;
    }
    return Math.min(Math.floor(raw), HARD_MAX_SYNC_ITEMS);
}

function parseDateOnly(value: string): DateArray {
    const [year, month, day] = value.split('-').map(Number);
    return [year, month, day];
}

function addDaysToDateOnly(date: DateArray, days: number): DateArray {
    const utcDate = new Date(Date.UTC(date[0], date[1] - 1, date[2]));
    utcDate.setUTCDate(utcDate.getUTCDate() + days);
    return [utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, utcDate.getUTCDate()];
}

async function queryNotionPages(
    notion: Client,
    source: QuerySource,
    sourceId: string,
    queryOptions: any,
    maxItems: number
): Promise<PageObjectResponse[]> {
    const results: PageObjectResponse[] = [];
    let startCursor: string | undefined;

    for (let i = 0; i < MAX_PAGE_REQUESTS; i++) {
        const remaining = maxItems - results.length;
        if (remaining <= 0) break;

        const pageSize = Math.min(PAGE_SIZE_LIMIT, remaining);
        let response: any;

        if (source === 'database') {
            response = await (notion.databases as any).query({
                database_id: sourceId,
                ...queryOptions,
                page_size: pageSize,
                start_cursor: startCursor,
            });
        } else {
            response = await (notion as any).dataSources.query({
                data_source_id: sourceId,
                ...queryOptions,
                page_size: pageSize,
                start_cursor: startCursor,
            });
        }

        results.push(...(response.results as PageObjectResponse[]));

        if (!response.has_more || !response.next_cursor) break;
        startCursor = response.next_cursor;
    }

    return results;
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id: rawId } = await context.params;
        let id = rawId;
        if (id.endsWith('.ics')) {
            id = id.slice(0, -4);
        }

        const feed = await prisma.feed.findUnique({
            where: { id },
        });

        if (!feed) {
            return new NextResponse('Feed not found', { status: 404 });
        }

        if (!feed.databaseId) {
            return new NextResponse('Feed not configured', { status: 400 });
        }

        const notion = new Client({ auth: feed.accessToken });
        const mappings = JSON.parse(feed.properties) as {
            name?: string;
            date?: string;
            description?: string;
        };

        if (!mappings.name || !mappings.date) {
            return new NextResponse('Invalid feed mappings', { status: 400 });
        }

        // Query Notion for events. Notion returns max 100 per request, so we paginate.
        const queryOptions = {
            filter: {
                property: mappings.date,
                date: {
                    is_not_empty: true,
                },
            },
            sorts: [
                {
                    property: mappings.date,
                    direction: 'ascending',
                },
            ],
        };

        const maxItems = getMaxSyncItems();
        let pages: PageObjectResponse[] = [];

        try {
            pages = await queryNotionPages(notion, 'database', feed.databaseId, queryOptions, maxItems);
        } catch (databaseQueryError) {
            // New Notion workspaces may expose "data_source" objects instead of "database".
            if ((notion as any).dataSources?.query) {
                pages = await queryNotionPages(notion, 'data_source', feed.databaseId, queryOptions, maxItems);
            } else {
                throw databaseQueryError;
            }
        }

        const events: EventAttributes[] = [];

        for (const page of pages) {
            const props = page.properties;

            // Handle Title
            let title = 'Untitled Event';
            const titleProp = props[mappings.name];
            if (titleProp?.type === 'title' && titleProp.title.length > 0) {
                title = titleProp.title.map((t) => t.plain_text).join('');
            } else if (titleProp?.type === 'rich_text' && titleProp.rich_text.length > 0) {
                title = titleProp.rich_text.map((t) => t.plain_text).join('');
            }

            // Handle Date
            const dateProp = props[mappings.date];
            if (dateProp?.type !== 'date' || !dateProp.date) continue;

            const startDateStr = dateProp.date.start;
            const endDateStr = dateProp.date.end;

            const isAllDay = DATE_ONLY_REGEX.test(startDateStr);
            let start: DateArray;

            if (isAllDay) {
                start = parseDateOnly(startDateStr);
            } else {
                const startDate = new Date(startDateStr);
                if (Number.isNaN(startDate.getTime())) continue;
                start = [
                    startDate.getFullYear(),
                    startDate.getMonth() + 1,
                    startDate.getDate(),
                    startDate.getHours(),
                    startDate.getMinutes(),
                ];
            }

            const event: any = {
                start,
                title,
                uid: page.id, // Use Notion Page ID as UID to allow updates
                url: page.url,
            };

            if (endDateStr) {
                if (isAllDay) {
                    if (!DATE_ONLY_REGEX.test(endDateStr)) continue;
                    // Notion all-day range end is inclusive, ICS end is exclusive.
                    event.end = addDaysToDateOnly(parseDateOnly(endDateStr), 1);
                } else {
                    const endDate = new Date(endDateStr);
                    if (Number.isNaN(endDate.getTime())) continue;
                    event.end = [endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate(), endDate.getHours(), endDate.getMinutes()];
                }
            } else {
                if (!isAllDay) {
                    event.duration = { hours: 1 };
                }
            }

            // Handle Description
            if (mappings.description) {
                const descProp = props[mappings.description];
                if (descProp?.type === 'rich_text' && descProp.rich_text.length > 0) {
                    event.description = descProp.rich_text.map((t) => t.plain_text).join('');
                }
            }

            events.push(event);
        }

        const { error, value } = createEvents(events);
        if (error) {
            console.error('ICS Generation Error:', error);
            return new NextResponse('Error generating calendar', { status: 500 });
        }

        return new NextResponse(value, {
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': `attachment; filename="notion-calendar-${id}.ics"`,
                'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=30',
            },
        });

    } catch (err) {
        console.error(err);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
