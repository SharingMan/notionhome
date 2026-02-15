import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from '@/lib/admin-auth';

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
        // ignore parse errors in legacy/invalid rows
    }
    return {};
}

function formatDateTime(date: Date): string {
    return date.toLocaleString('zh-CN', { hour12: false });
}

function getPageMessage(searchParams: { status?: string; error?: string }): { tone: 'success' | 'error'; text: string } | null {
    if (searchParams.status === 'updated') {
        return { tone: 'success', text: '订阅已更新。' };
    }
    if (searchParams.status === 'deleted') {
        return { tone: 'success', text: '订阅已删除。' };
    }
    if (searchParams.error === 'unauthorized') {
        return { tone: 'error', text: '登录状态已过期，请重新登录。' };
    }
    if (searchParams.error === 'invalid_payload') {
        return { tone: 'error', text: '请完整填写数据库 ID、标题字段和日期字段。' };
    }
    if (searchParams.error === 'not_found') {
        return { tone: 'error', text: '目标订阅不存在。' };
    }
    if (searchParams.error === 'update_failed') {
        return { tone: 'error', text: '更新失败，请重试。' };
    }
    if (searchParams.error === 'delete_failed') {
        return { tone: 'error', text: '删除失败，请重试。' };
    }
    return null;
}

export default async function AdminPage(props: { searchParams: Promise<{ error?: string; status?: string }> }) {
    const searchParams = await props.searchParams;
    const headerList = await headers();
    const cookieStore = await cookies();
    const adminToken = process.env.ADMIN_TOKEN?.trim();
    const sessionValue = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    const loggedIn = isValidAdminSession(sessionValue, adminToken);

    if (!adminToken) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <div className="bg-white shadow-xl rounded-lg max-w-xl w-full p-8 space-y-4">
                    <h1 className="text-2xl font-bold text-gray-900">后台未启用</h1>
                    <p className="text-gray-700">请在 Railway 变量中设置 `ADMIN_TOKEN` 后重新部署。</p>
                    <p className="text-sm text-gray-500">然后访问 `/admin` 登录查看所有订阅项目。</p>
                </div>
            </div>
        );
    }

    if (!loggedIn) {
        const authError =
            searchParams.error === 'invalid'
                ? '口令错误，请重试。'
                : searchParams.error === 'unauthorized'
                  ? '登录状态已过期，请重新登录。'
                  : undefined;
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <div className="bg-white shadow-xl rounded-lg max-w-md w-full p-8 space-y-5">
                    <h1 className="text-2xl font-bold text-gray-900">订阅后台登录</h1>
                    <p className="text-sm text-gray-600">请输入 `ADMIN_TOKEN` 进入订阅管理页。</p>
                    {authError && <p className="text-sm text-red-600">{authError}</p>}
                    <form action="/api/admin/login" method="post" className="space-y-4">
                        <input
                            type="password"
                            name="token"
                            placeholder="ADMIN_TOKEN"
                            className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                        <button
                            type="submit"
                            className="w-full bg-black text-white py-2.5 px-4 rounded-md font-medium hover:bg-gray-800"
                        >
                            登录
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const baseUrl = getBaseUrl(headerList);
    const feeds = await prisma.feed.findMany({
        orderBy: { updatedAt: 'desc' },
    });
    const pageMessage = getPageMessage(searchParams);

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
                <div className="mb-6 rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-200 sm:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Notion 订阅项目</h1>
                            <p className="mt-2 text-sm text-slate-600">当前共 {feeds.length} 个 feed。</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <a
                                href="/api/auth/notion"
                                className="inline-flex items-center rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                            >
                                新增订阅
                            </a>
                            <Link
                                href="/"
                                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                                返回首页
                            </Link>
                            <form action="/api/admin/logout" method="post">
                                <button
                                    type="submit"
                                    className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                >
                                    退出登录
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {pageMessage && (
                    <div
                        className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
                            pageMessage.tone === 'success'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}
                    >
                        {pageMessage.text}
                    </div>
                )}

                <div className="space-y-4">
                    {feeds.map((feed) => {
                        const mappings = parseMappings(feed.properties);
                        const icsUrl = `${baseUrl}/api/feed/${feed.id}.ics`;
                        const isConfigured = Boolean(feed.databaseId && mappings.name && mappings.date);
                        const updateFormId = `update-${feed.id}`;

                        return (
                            <section key={feed.id} id={`feed-${feed.id}`} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                                    isConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                }`}
                                            >
                                                {isConfigured ? '已配置' : '待配置'}
                                            </span>
                                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                                Feed
                                            </span>
                                        </div>
                                        <p className="break-all font-mono text-xs text-slate-600">{feed.id}</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                            <span>创建: {formatDateTime(feed.createdAt)}</span>
                                            <span>更新: {formatDateTime(feed.updatedAt)}</span>
                                        </div>
                                        <p className="break-all font-mono text-xs text-slate-500">
                                            Bot ID: {feed.botId || '-'}
                                        </p>
                                    </div>

                                    <div className="w-full max-w-xl space-y-2">
                                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">ICS 订阅地址</p>
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
                                                    打开
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500">请先完成字段配置后再生成可用 ICS。</p>
                                        )}
                                    </div>
                                </div>

                                <form
                                    id={updateFormId}
                                    action={`/api/admin/feeds/${feed.id}/update`}
                                    method="post"
                                    className="grid grid-cols-1 gap-3 md:grid-cols-2"
                                >
                                    <label className="md:col-span-2">
                                        <span className="mb-1 block text-sm font-medium text-slate-700">数据库 ID</span>
                                        <input
                                            type="text"
                                            name="databaseId"
                                            defaultValue={feed.databaseId || ''}
                                            className="h-10 w-full rounded-md border border-slate-300 px-3 font-mono text-xs text-slate-700"
                                            placeholder="database/data_source id"
                                            required
                                        />
                                    </label>
                                    <label>
                                        <span className="mb-1 block text-sm font-medium text-slate-700">标题字段</span>
                                        <input
                                            type="text"
                                            name="name"
                                            defaultValue={mappings.name || ''}
                                            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-700"
                                            placeholder="Name"
                                            required
                                        />
                                    </label>
                                    <label>
                                        <span className="mb-1 block text-sm font-medium text-slate-700">日期字段</span>
                                        <input
                                            type="text"
                                            name="date"
                                            defaultValue={mappings.date || ''}
                                            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-700"
                                            placeholder="Date"
                                            required
                                        />
                                    </label>
                                    <label className="md:col-span-2">
                                        <span className="mb-1 block text-sm font-medium text-slate-700">描述字段（可选）</span>
                                        <input
                                            type="text"
                                            name="description"
                                            defaultValue={mappings.description || ''}
                                            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-700"
                                            placeholder="Description"
                                        />
                                    </label>
                                </form>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <button
                                        type="submit"
                                        form={updateFormId}
                                        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                                    >
                                        保存
                                    </button>
                                    <Link
                                        href={`/config/${feed.id}`}
                                        className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                    >
                                        配置页
                                    </Link>
                                    <form action={`/api/admin/feeds/${feed.id}/delete`} method="post">
                                        <button
                                            type="submit"
                                            className="inline-flex items-center rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
                                        >
                                            删除
                                        </button>
                                    </form>
                                </div>
                            </section>
                        );
                    })}

                    {feeds.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                            还没有订阅项目，点击上方“新增订阅”开始创建。
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
