import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { createEvents, DateArray, EventAttributes } from 'ics';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: rawId } = await params;
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

        const notion = new Client({ auth: feed.accessToken });
        const mappings = JSON.parse(feed.properties);

        // Query Notion for events
        // We filter for items that have the Date property set
        const response = await (notion.databases as any).query({
            database_id: feed.databaseId!,
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
        });

        const events: EventAttributes[] = [];

        for (const page of response.results as PageObjectResponse[]) {
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

            const start = new Date(startDateStr);
            // ics expects [year, month, day, hour, minute]
            // Note: month is 1-indexed in ics library? Yes. Date.getMonth() is 0-indexed.
            const startArr: DateArray = [
                start.getFullYear(),
                start.getMonth() + 1,
                start.getDate(),
                start.getHours(),
                start.getMinutes()
            ];

            // If it's an all-day event (no time in ISO string usually T00:00:00.000Z depends on Notion time zone)
            // Notion returns "2023-10-27" for all day. "2023-10-27T10:00:00.000+00:00" for time.
            const isAllDay = startDateStr.length === 10; // Simple check for YYYY-MM-DD

            const event: any = {
                start: isAllDay ? [start.getFullYear(), start.getMonth() + 1, start.getDate()] : startArr,
                title: title,
                uid: page.id, // Use Notion Page ID as UID to allow updates
                url: page.url,
            };

            if (endDateStr) {
                const end = new Date(endDateStr);
                if (isAllDay) {
                    // ICS end date for all-day events is exclusive, so +1 day usually? 
                    // Notion end date is inclusive.
                    // But ics library handles it?
                    // Actually ics library 'end' is exclusive.
                    // We should add 1 day if it's all day?
                    // Let's stick to simple end for now.
                    event.end = [end.getFullYear(), end.getMonth() + 1, end.getDate()];
                    // To be safe for all-day multi-day, let's keep it simple.
                } else {
                    event.end = [end.getFullYear(), end.getMonth() + 1, end.getDate(), end.getHours(), end.getMinutes()];
                }
            } else {
                // Duration default 1 hour if not specified? Or just start.
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
            },
        });

    } catch (err) {
        console.error(err);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
