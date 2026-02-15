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
            return parsed;
        }
    } catch {
        // ignore parse errors in legacy/invalid rows
    }
    return {};
}

export default async function AdminPage(props: { searchParams: Promise<{ error?: string }> }) {
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
        const hasInvalidError = searchParams.error === 'invalid';
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <div className="bg-white shadow-xl rounded-lg max-w-md w-full p-8 space-y-5">
                    <h1 className="text-2xl font-bold text-gray-900">订阅后台登录</h1>
                    <p className="text-sm text-gray-600">请输入 `ADMIN_TOKEN` 进入订阅管理页。</p>
                    {hasInvalidError && <p className="text-sm text-red-600">口令错误，请重试。</p>}
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

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Notion 订阅项目</h1>
                        <p className="text-sm text-gray-600 mt-1">当前共 {feeds.length} 个 feed。</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-sm text-blue-600 hover:text-blue-700">
                            返回首页
                        </Link>
                        <form action="/api/admin/logout" method="post">
                            <button type="submit" className="text-sm text-gray-600 hover:text-gray-800">
                                退出登录
                            </button>
                        </form>
                    </div>
                </div>

                <div className="bg-white shadow-xl rounded-lg overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 text-gray-700">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold">Feed ID</th>
                                <th className="text-left px-4 py-3 font-semibold">状态</th>
                                <th className="text-left px-4 py-3 font-semibold">Bot ID</th>
                                <th className="text-left px-4 py-3 font-semibold">数据库 ID</th>
                                <th className="text-left px-4 py-3 font-semibold">标题字段</th>
                                <th className="text-left px-4 py-3 font-semibold">日期字段</th>
                                <th className="text-left px-4 py-3 font-semibold">创建时间</th>
                                <th className="text-left px-4 py-3 font-semibold">更新时间</th>
                                <th className="text-left px-4 py-3 font-semibold">ICS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {feeds.map((feed) => {
                                const mappings = parseMappings(feed.properties);
                                const icsUrl = `${baseUrl}/api/feed/${feed.id}.ics`;
                                const isConfigured = Boolean(feed.databaseId && mappings.name && mappings.date);
                                return (
                                    <tr key={feed.id} className="border-t border-gray-200 align-top">
                                        <td className="px-4 py-3 font-mono text-xs break-all">{feed.id}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {isConfigured ? (
                                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">已配置</span>
                                            ) : (
                                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">待配置</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs break-all">{feed.botId || '-'}</td>
                                        <td className="px-4 py-3 font-mono text-xs break-all">{feed.databaseId || '-'}</td>
                                        <td className="px-4 py-3">{mappings.name || '-'}</td>
                                        <td className="px-4 py-3">{mappings.date || '-'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{feed.createdAt.toLocaleString('zh-CN')}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{feed.updatedAt.toLocaleString('zh-CN')}</td>
                                        <td className="px-4 py-3">
                                            {isConfigured ? (
                                                <a href={icsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 break-all">
                                                    {icsUrl}
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
