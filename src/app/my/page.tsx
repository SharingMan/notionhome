import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { detectLocaleFromHeaders } from '@/lib/i18n';
import { NOTION_USER_SESSION_COOKIE, parseNotionUserSessionValue } from '@/lib/notion-user-session';

function getBaseUrl(headerList: Headers): string {
    const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
    if (fromEnv) return fromEnv;

    const proto = headerList.get('x-forwarded-proto') || 'https';
    const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost:3000';
    return `${proto}://${host}`.replace(/\/$/, '');
}

function parseMappings(raw: string): { name?: string; date?: string; description?: string } {
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            const result: { name?: string; date?: string; description?: string } = {};
            if (typeof parsed.name === 'string') result.name = parsed.name;
            if (typeof parsed.date === 'string') result.date = parsed.date;
            if (typeof parsed.description === 'string') result.description = parsed.description;
            return result;
        }
    } catch {
        return {};
    }
    return {};
}

function formatDateTime(date: Date): string {
    return date.toLocaleString('zh-CN', { hour12: false });
}

export default async function MySubscriptionsPage() {
    const headerList = await headers();
    const locale = detectLocaleFromHeaders(headerList);
    const isZh = locale === 'zh-CN';
    const cookieStore = await cookies();
    const session = parseNotionUserSessionValue(cookieStore.get(NOTION_USER_SESSION_COOKIE)?.value);
    const baseUrl = getBaseUrl(headerList);

    if (!session) {
        return (
            <div className="min-h-screen bg-slate-50">
                <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10 sm:px-6">
                    <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
                        <h1 className="text-2xl font-bold text-slate-900">
                            {isZh ? '我的 Notion 订阅' : 'My Notion Subscriptions'}
                        </h1>
                        <p className="mt-3 text-sm text-slate-600">
                            {isZh
                                ? '先用 Notion 登录，再查看当前账号已授权并创建的订阅。'
                                : 'Sign in with Notion to see subscriptions created by your account.'}
                        </p>
                        <div className="mt-6 flex flex-wrap gap-2">
                            <a
                                href="/api/auth/notion?mode=login"
                                className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                            >
                                {isZh ? 'Notion 登录' : 'Sign in with Notion'}
                            </a>
                            <Link
                                href="/"
                                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            >
                                {isZh ? '返回首页' : 'Back to Home'}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const feeds = await prisma.feed.findMany({
        where: { ownerKey: session.ownerKey },
        orderBy: { updatedAt: 'desc' },
    });

    const displayName = session.ownerUserName || session.workspaceName || session.ownerUserId || session.workspaceId || 'Notion User';

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
                <div className="mb-6 rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-200 sm:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                                {isZh ? '我的 Notion 订阅' : 'My Notion Subscriptions'}
                            </h1>
                            <p className="mt-2 text-sm text-slate-600">
                                {isZh ? '当前账号' : 'Current account'}: {displayName}
                            </p>
                            <p className="text-sm text-slate-600">
                                {isZh ? '共' : 'Total'} {feeds.length} {isZh ? '个订阅' : 'feeds'}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <a
                                href="/api/auth/notion"
                                className="inline-flex items-center rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                            >
                                {isZh ? '新增订阅' : 'Add Subscription'}
                            </a>
                            <Link
                                href="/"
                                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                                {isZh ? '返回首页' : 'Back to Home'}
                            </Link>
                            <form action="/api/auth/logout" method="post">
                                <button
                                    type="submit"
                                    className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                >
                                    {isZh ? '退出登录' : 'Sign Out'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {feeds.map((feed) => {
                        const mappings = parseMappings(feed.properties);
                        const isConfigured = Boolean(feed.databaseId && mappings.name && mappings.date);
                        const icsUrl = `${baseUrl}/api/feed/${feed.id}.ics`;

                        return (
                            <section key={feed.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                                <div className="mb-4 flex flex-wrap items-center gap-2">
                                    <span
                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                            isConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                        }`}
                                    >
                                        {isConfigured ? (isZh ? '已配置' : 'Configured') : (isZh ? '待配置' : 'Pending')}
                                    </span>
                                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                        Feed
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-2">
                                    <p className="break-all font-mono text-xs text-slate-600 md:col-span-2">ID: {feed.id}</p>
                                    <p className="break-all">
                                        <span className="font-medium">{isZh ? '数据库 ID' : 'Database ID'}:</span> {feed.databaseId || '-'}
                                    </p>
                                    <p>
                                        <span className="font-medium">{isZh ? '标题字段' : 'Title field'}:</span> {mappings.name || '-'}
                                    </p>
                                    <p>
                                        <span className="font-medium">{isZh ? '日期字段' : 'Date field'}:</span> {mappings.date || '-'}
                                    </p>
                                    <p>
                                        <span className="font-medium">{isZh ? '描述字段' : 'Description field'}:</span> {mappings.description || '-'}
                                    </p>
                                    <p>
                                        <span className="font-medium">{isZh ? '创建时间' : 'Created'}:</span> {formatDateTime(feed.createdAt)}
                                    </p>
                                    <p>
                                        <span className="font-medium">{isZh ? '更新时间' : 'Updated'}:</span> {formatDateTime(feed.updatedAt)}
                                    </p>
                                </div>

                                <div className="mt-4 space-y-2">
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">ICS URL</p>
                                    {isConfigured ? (
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <input
                                                type="text"
                                                readOnly
                                                value={icsUrl}
                                                className="h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-700"
                                            />
                                            <a
                                                href={icsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
                                            >
                                                {isZh ? '打开' : 'Open'}
                                            </a>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">
                                            {isZh ? '请先完成配置后再订阅该 ICS。' : 'Configure this feed before subscribing to its ICS URL.'}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Link
                                        href={`/config/${feed.id}`}
                                        className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                    >
                                        {isZh ? '打开配置页' : 'Open Config'}
                                    </Link>
                                </div>
                            </section>
                        );
                    })}

                    {feeds.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                            {isZh
                                ? '当前账号还没有订阅项目。点击上方“新增订阅”创建。'
                                : 'No subscriptions yet for this account. Click "Add Subscription" to create one.'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

