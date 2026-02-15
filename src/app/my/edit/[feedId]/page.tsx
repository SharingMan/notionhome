import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { detectLocaleFromHeaders } from '@/lib/i18n';
import { NOTION_USER_SESSION_COOKIE, parseNotionUserSessionValue } from '@/lib/notion-user-session';
import { parseFeedMappings } from '@/lib/feed-mapping';

function getBaseUrl(headerList: Headers): string {
    const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
    if (fromEnv) return fromEnv;

    const proto = headerList.get('x-forwarded-proto') || 'https';
    const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost:3000';
    return `${proto}://${host}`.replace(/\/$/, '');
}

function getMessage(
    isZh: boolean,
    searchParams: { status?: string; error?: string }
): { tone: 'success' | 'error'; text: string } | null {
    if (searchParams.status === 'saved') {
        return { tone: 'success', text: isZh ? '已保存订阅配置。' : 'Subscription settings saved.' };
    }
    if (searchParams.error === 'invalid_payload') {
        return { tone: 'error', text: isZh ? '请完整填写数据库 ID、标题字段和日期字段。' : 'Please fill database ID, title property and date property.' };
    }
    return null;
}

export default async function MyEditPage(props: {
    params: Promise<{ feedId: string }>;
    searchParams: Promise<{ status?: string; error?: string }>;
}) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const headerList = await headers();
    const locale = detectLocaleFromHeaders(headerList);
    const isZh = locale === 'zh-CN';
    const cookieStore = await cookies();
    const session = parseNotionUserSessionValue(cookieStore.get(NOTION_USER_SESSION_COOKIE)?.value);

    if (!session) {
        return (
            <div className="min-h-screen bg-[#f5f2eb] px-4 py-10">
                <div className="mx-auto max-w-xl rounded-xl bg-white p-8 shadow-sm ring-1 ring-black/5">
                    <h1 className="text-2xl font-semibold text-slate-900">{isZh ? '登录已过期' : 'Session expired'}</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        {isZh ? '请重新使用 Notion 登录后继续编辑。' : 'Please sign in with Notion again to continue.'}
                    </p>
                    <a
                        href="/api/auth/notion?mode=login"
                        className="mt-5 inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                    >
                        {isZh ? '重新登录' : 'Sign in again'}
                    </a>
                </div>
            </div>
        );
    }

    const feed = await prisma.feed.findFirst({
        where: {
            id: params.feedId,
            ownerKey: session.ownerKey,
        },
    });

    if (!feed) {
        notFound();
    }

    const mappings = parseFeedMappings(feed.properties);
    const baseUrl = getBaseUrl(headerList);
    const icsUrl = `${baseUrl}/api/feed/${feed.id}.ics`;
    const pageMessage = getMessage(isZh, searchParams);

    return (
        <div className="min-h-screen bg-[#f5f2eb] px-4 py-8 sm:px-8">
            <div className="mx-auto max-w-6xl">
                <div className="mb-6 flex items-center justify-between gap-3">
                    <h1 className="text-4xl font-bold text-slate-900">{isZh ? '编辑订阅' : 'Calendar Settings'}</h1>
                    <Link
                        href="/my"
                        className="inline-flex items-center rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                        {isZh ? '返回列表' : 'Back'}
                    </Link>
                </div>

                {pageMessage && (
                    <div
                        className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                            pageMessage.tone === 'success'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}
                    >
                        {pageMessage.text}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
                    <aside className="space-y-10 px-2 py-2 text-slate-700">
                        <p className="text-lg">{isZh ? '基本设置' : 'General Settings'}</p>
                        <p className="text-lg">{isZh ? '字段设置' : 'Property Settings'}</p>
                    </aside>

                    <section className="rounded-xl border border-black/10 bg-[#efe6d7] p-6 shadow-sm">
                        <form action={`/api/my/feeds/${feed.id}/save`} method="post" className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <label>
                                    <span className="mb-1 block text-sm font-medium text-slate-700">
                                        {isZh ? '日历名称' : 'Calendar Name'}
                                    </span>
                                    <input
                                        type="text"
                                        name="displayName"
                                        defaultValue={feed.displayName || mappings.name || ''}
                                        className="h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-slate-800"
                                        placeholder={isZh ? '例如：工作日程' : 'e.g. Work Calendar'}
                                    />
                                </label>
                                <label>
                                    <span className="mb-1 block text-sm font-medium text-slate-700">
                                        {isZh ? 'Notion 数据库 ID' : 'Notion Database ID'}
                                    </span>
                                    <input
                                        type="text"
                                        name="databaseId"
                                        defaultValue={feed.databaseId || ''}
                                        className="h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-slate-800"
                                        placeholder="database/data_source id"
                                        required
                                    />
                                </label>
                            </div>

                            <div className="border-t border-black/10 pt-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <label>
                                        <span className="mb-1 block text-sm font-medium text-slate-700">
                                            {isZh ? '日期字段' : 'Date Property'}
                                        </span>
                                        <input
                                            type="text"
                                            name="dateProperty"
                                            defaultValue={mappings.date || ''}
                                            className="h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-slate-800"
                                            placeholder={isZh ? '例如：Date' : 'e.g. Date'}
                                            required
                                        />
                                    </label>
                                    <label>
                                        <span className="mb-1 block text-sm font-medium text-slate-700">
                                            {isZh ? '标题字段' : 'Title Property'}
                                        </span>
                                        <input
                                            type="text"
                                            name="titleProperty"
                                            defaultValue={mappings.name || ''}
                                            className="h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-slate-800"
                                            placeholder={isZh ? '例如：Name' : 'e.g. Name'}
                                            required
                                        />
                                    </label>
                                    <label className="md:col-span-2">
                                        <span className="mb-1 block text-sm font-medium text-slate-700">
                                            {isZh ? '描述字段（可选）' : 'Description Property (optional)'}
                                        </span>
                                        <input
                                            type="text"
                                            name="descriptionProperty"
                                            defaultValue={mappings.description || ''}
                                            className="h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-slate-800"
                                            placeholder={isZh ? '例如：Description' : 'e.g. Description'}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="border-t border-black/10 pt-6">
                                <p className="mb-2 text-sm font-medium text-slate-700">ICS URL</p>
                                <input
                                    type="text"
                                    readOnly
                                    value={icsUrl}
                                    className="h-11 w-full rounded-md border border-black/10 bg-white px-3 text-xs text-slate-700"
                                />
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                <button
                                    type="submit"
                                    form={`delete-feed-${feed.id}`}
                                    className="inline-flex items-center rounded-full bg-rose-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-600"
                                >
                                    {isZh ? '删除订阅' : 'Delete calendar'}
                                </button>

                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/config/${feed.id}`}
                                        className="inline-flex items-center rounded-md border border-black/10 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                    >
                                        {isZh ? '高级配置' : 'Advanced Config'}
                                    </Link>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center rounded-full bg-blue-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600"
                                    >
                                        {isZh ? '保存' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </form>
                        <form id={`delete-feed-${feed.id}`} action={`/api/my/feeds/${feed.id}/delete`} method="post" />
                    </section>
                </div>
            </div>
        </div>
    );
}
