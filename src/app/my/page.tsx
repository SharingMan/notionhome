import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { PencilLine, Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { detectLocaleFromHeaders } from '@/lib/i18n';
import { NOTION_USER_SESSION_COOKIE, parseNotionUserSessionValue } from '@/lib/notion-user-session';
import { parseFeedMappings } from '@/lib/feed-mapping';
import CopyUrlButton from './CopyUrlButton';

function getBaseUrl(headerList: Headers): string {
    const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
    if (fromEnv) return fromEnv;

    const proto = headerList.get('x-forwarded-proto') || 'https';
    const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost:3000';
    return `${proto}://${host}`.replace(/\/$/, '');
}

function formatDateTime(date: Date): string {
    return date.toLocaleString('zh-CN', { hour12: false });
}

function getMessage(
    isZh: boolean,
    searchParams: { status?: string; error?: string }
): { tone: 'success' | 'error'; text: string } | null {
    if (searchParams.status === 'deleted') {
        return { tone: 'success', text: isZh ? '订阅已删除。' : 'Subscription deleted.' };
    }
    if (searchParams.error === 'unauthorized') {
        return { tone: 'error', text: isZh ? '登录状态已过期，请重新登录。' : 'Session expired. Please sign in again.' };
    }
    if (searchParams.error === 'not_found') {
        return { tone: 'error', text: isZh ? '订阅不存在或无权限访问。' : 'Subscription not found or access denied.' };
    }
    return null;
}

export default async function MySubscriptionsPage(props: { searchParams: Promise<{ status?: string; error?: string }> }) {
    const searchParams = await props.searchParams;
    const headerList = await headers();
    const locale = detectLocaleFromHeaders(headerList);
    const isZh = locale === 'zh-CN';
    const cookieStore = await cookies();
    const session = parseNotionUserSessionValue(cookieStore.get(NOTION_USER_SESSION_COOKIE)?.value);
    const baseUrl = getBaseUrl(headerList);

    if (!session) {
        return (
            <div className="min-h-screen bg-[#f5f2eb]">
                <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-12 sm:px-6">
                    <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
                        <h1 className="text-2xl font-semibold text-slate-900">
                            {isZh ? '我的日历订阅' : 'My Calendar Subscriptions'}
                        </h1>
                        <p className="mt-3 text-sm text-slate-600">
                            {isZh ? '请先通过 Notion 登录，再查看和管理你的订阅。' : 'Sign in with Notion to view and manage your subscriptions.'}
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
    const pageMessage = getMessage(isZh, searchParams);

    return (
        <div className="min-h-screen bg-[#f5f2eb] px-4 py-8 sm:px-8">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900">{isZh ? '我的日历订阅' : 'My Calendars'}</h1>
                        <p className="mt-2 text-sm text-slate-600">
                            {isZh ? '当前账号' : 'Account'}: {displayName}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/"
                            className="inline-flex items-center rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                            {isZh ? '首页' : 'Home'}
                        </Link>
                        <form action="/api/auth/logout" method="post">
                            <button
                                type="submit"
                                className="inline-flex items-center rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            >
                                {isZh ? '退出' : 'Sign out'}
                            </button>
                        </form>
                    </div>
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

                <section className="overflow-hidden rounded-xl border border-black/10 bg-[#efe6d7] shadow-sm">
                    <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
                        <h2 className="text-3xl font-semibold text-slate-900">{isZh ? '订阅列表' : 'My Calendars'}</h2>
                        <a
                            href="/api/auth/notion"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white shadow hover:bg-emerald-600"
                            title={isZh ? '新增订阅' : 'Add subscription'}
                        >
                            <Plus className="h-6 w-6" />
                        </a>
                    </div>

                    {feeds.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-[#f6f0e4] text-slate-900">
                                    <tr className="[&>th]:px-6 [&>th]:py-4 [&>th]:font-semibold">
                                        <th>{isZh ? '名称' : 'NAME'}</th>
                                        <th>{isZh ? '状态' : 'STATE'}</th>
                                        <th>{isZh ? 'NOTION 数据库' : 'NOTION DATABASE'}</th>
                                        <th>{isZh ? '日历链接' : 'CALENDAR URL'}</th>
                                        <th>{isZh ? '最后更新' : 'LAST UPDATED'}</th>
                                        <th className="text-right">{isZh ? '编辑' : 'EDIT'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {feeds.map((feed) => {
                                        const mappings = parseFeedMappings(feed.properties);
                                        const configured = Boolean(feed.databaseId && mappings.name && mappings.date);
                                        const icsUrl = `${baseUrl}/api/feed/${feed.id}.ics`;
                                        const rowName = feed.displayName || mappings.name || (isZh ? '未命名订阅' : 'Untitled');
                                        return (
                                            <tr key={feed.id} className="border-t border-black/5 bg-[#f2e7d5] [&>td]:px-6 [&>td]:py-4 align-middle">
                                                <td className="font-medium text-slate-900">{rowName}</td>
                                                <td>
                                                    {configured ? (
                                                        <span className="inline-flex rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                                                            {isZh ? '可用' : 'Available'}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
                                                            {isZh ? '待配置' : 'Pending'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="max-w-[280px] truncate" title={feed.databaseId || '-'}>
                                                    {feed.databaseId || '-'}
                                                </td>
                                                <td>
                                                    {configured ? (
                                                        <CopyUrlButton
                                                            url={icsUrl}
                                                            copyLabel={isZh ? '复制到剪贴板' : 'Copy to clipboard'}
                                                            copiedLabel={isZh ? '已复制' : 'Copied'}
                                                        />
                                                    ) : (
                                                        <span className="text-slate-500">{isZh ? '未生成' : 'Not ready'}</span>
                                                    )}
                                                </td>
                                                <td>{formatDateTime(feed.updatedAt)}</td>
                                                <td className="text-right">
                                                    <Link
                                                        href={`/my/edit/${feed.id}`}
                                                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-white shadow hover:bg-blue-600"
                                                        title={isZh ? '编辑订阅' : 'Edit subscription'}
                                                    >
                                                        <PencilLine className="h-5 w-5" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="px-6 py-10 text-center text-slate-600">
                            {isZh ? '当前账号还没有订阅，点击右上角 + 新建。' : 'No subscriptions yet. Click + to create one.'}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

