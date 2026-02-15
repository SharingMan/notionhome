import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { Check } from 'lucide-react';
import { detectLocaleFromHeaders } from '@/lib/i18n';
import { NOTION_USER_SESSION_COOKIE, parseNotionUserSessionValue } from '@/lib/notion-user-session';
import { getOwnerPlanSummary } from '@/lib/billing';

function renderStatusMessage(
    isZh: boolean,
    searchParams: { status?: string; error?: string; reason?: string }
): { tone: 'success' | 'error'; text: string } | null {
    if (searchParams.reason === 'limit') {
        return {
            tone: 'error',
            text: isZh
                ? '你已达到免费版订阅数量上限，请升级到 Premium。'
                : 'You reached the free plan subscription limit. Upgrade to Premium.',
        };
    }
    if (searchParams.status === 'trial_started') {
        return {
            tone: 'success',
            text: isZh ? 'Premium 试用已开启。' : 'Premium trial has started.',
        };
    }
    if (searchParams.error === 'trial_already_used') {
        return {
            tone: 'error',
            text: isZh ? '你已经使用过试用资格。' : 'Trial was already used.',
        };
    }
    if (searchParams.error === 'unauthorized') {
        return {
            tone: 'error',
            text: isZh ? '请先登录 Notion。' : 'Please sign in with Notion first.',
        };
    }
    return null;
}

export default async function PricingPage(props: { searchParams: Promise<{ status?: string; error?: string; reason?: string }> }) {
    const searchParams = await props.searchParams;
    const headerList = await headers();
    const locale = detectLocaleFromHeaders(headerList);
    const isZh = locale === 'zh-CN';
    const session = parseNotionUserSessionValue((await cookies()).get(NOTION_USER_SESSION_COOKIE)?.value);
    const planSummary = session ? await getOwnerPlanSummary(session.ownerKey) : null;
    const isPremium = Boolean(planSummary?.premiumActive);
    const statusMessage = renderStatusMessage(isZh, searchParams);
    const monthlyCheckout = process.env.BILLING_CHECKOUT_URL_MONTHLY?.trim();
    const yearlyCheckout = process.env.BILLING_CHECKOUT_URL_YEARLY?.trim();

    return (
        <div className="min-h-screen bg-[#f5f2eb] px-4 py-8 sm:px-8">
            <div className="mx-auto max-w-6xl">
                <header className="mb-12 flex items-center justify-between">
                    <h1 className="text-4xl font-bold text-slate-900">{isZh ? '价格方案' : 'Pricing'}</h1>
                    <div className="flex items-center gap-2">
                        <Link href="/" className="rounded-md border border-black/10 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                            {isZh ? '首页' : 'Home'}
                        </Link>
                        <Link href="/my" className="rounded-md border border-black/10 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                            {isZh ? '我的订阅' : 'My Subscriptions'}
                        </Link>
                    </div>
                </header>

                {statusMessage && (
                    <div
                        className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                            statusMessage.tone === 'success'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}
                    >
                        {statusMessage.text}
                    </div>
                )}

                {planSummary && (
                    <div className="mb-8 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm text-slate-700">
                        {isZh ? '当前方案：' : 'Current plan: '}
                        <span className="font-semibold">{isPremium ? 'Premium' : 'Free'}</span>
                        {' · '}
                        {isZh ? '已创建订阅：' : 'Feeds: '}
                        <span className="font-semibold">{planSummary.feedCount}</span>
                        {!isPremium && Number.isFinite(planSummary.maxFeeds) && (
                            <>
                                {' / '}
                                <span className="font-semibold">{planSummary.maxFeeds}</span>
                            </>
                        )}
                    </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                    <section className="rounded-2xl bg-black p-8 text-white shadow-sm">
                        <h2 className="text-4xl font-semibold">{isZh ? '免费版' : 'Free'}</h2>
                        <p className="mt-3 text-4xl font-bold">€0 <span className="text-lg font-medium">/ month</span></p>
                        <ul className="mt-6 space-y-3 text-lg">
                            <li className="flex items-start gap-2"><Check className="mt-1 h-5 w-5" /> {isZh ? '1 个可同步日历' : 'One sync-able calendar'}</li>
                            <li className="flex items-start gap-2"><Check className="mt-1 h-5 w-5" /> {isZh ? '支持任意 iCal 客户端' : 'Works with any iCal-compatible app'}</li>
                            <li className="flex items-start gap-2"><Check className="mt-1 h-5 w-5" /> {isZh ? '基础字段映射' : 'Basic property mapping'}</li>
                        </ul>
                        <Link
                            href="/my"
                            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-white px-5 py-3 text-lg font-semibold text-black hover:bg-slate-100"
                        >
                            {isZh ? '继续免费使用' : 'Continue Free'}
                        </Link>
                    </section>

                    <section className="rounded-2xl bg-white p-8 text-slate-900 shadow-sm ring-1 ring-black/10">
                        <h2 className="text-4xl font-semibold">Premium</h2>
                        <p className="mt-3 text-4xl font-bold">€3 <span className="text-lg font-medium">/ month</span></p>
                        <ul className="mt-6 space-y-3 text-lg">
                            <li className="flex items-start gap-2"><Check className="mt-1 h-5 w-5" /> {isZh ? '无限订阅数量' : 'Unlimited calendars'}</li>
                            <li className="flex items-start gap-2"><Check className="mt-1 h-5 w-5" /> {isZh ? '高级过滤能力' : 'Notion-like filters'}</li>
                            <li className="flex items-start gap-2"><Check className="mt-1 h-5 w-5" /> {isZh ? '自定义刷新频率' : 'Custom refresh rates'}</li>
                            <li className="flex items-start gap-2"><Check className="mt-1 h-5 w-5" /> {isZh ? '优先支持' : 'Priority support'}</li>
                        </ul>

                        <div className="mt-8 space-y-2">
                            {!session && (
                                <a
                                    href="/api/auth/notion?mode=login"
                                    className="inline-flex w-full items-center justify-center rounded-xl bg-black px-5 py-3 text-lg font-semibold text-white hover:bg-slate-800"
                                >
                                    {isZh ? '先登录以升级' : 'Sign in to upgrade'}
                                </a>
                            )}

                            {session && !isPremium && !planSummary?.trialUsedAt && (
                                <form action="/api/billing/start-trial" method="post">
                                    <button
                                        type="submit"
                                        className="inline-flex w-full items-center justify-center rounded-xl bg-black px-5 py-3 text-lg font-semibold text-white hover:bg-slate-800"
                                    >
                                        {isZh ? '开启免费试用' : 'Start Free Trial'}
                                    </button>
                                </form>
                            )}

                            {session && !isPremium && (monthlyCheckout || yearlyCheckout) && (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {monthlyCheckout && (
                                        <a
                                            href={monthlyCheckout}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                                        >
                                            {isZh ? '按月订阅' : 'Monthly'}
                                        </a>
                                    )}
                                    {yearlyCheckout && (
                                        <a
                                            href={yearlyCheckout}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200"
                                        >
                                            {isZh ? '按年订阅' : 'Yearly'}
                                        </a>
                                    )}
                                </div>
                            )}

                            {session && isPremium && (
                                <div className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-100 px-5 py-3 text-lg font-semibold text-emerald-700">
                                    {isZh ? '你已是 Premium 用户' : 'You are Premium'}
                                </div>
                            )}

                            {session && !isPremium && !monthlyCheckout && !yearlyCheckout && (
                                <p className="text-sm text-slate-500">
                                    {isZh
                                        ? '可先开启试用；上线支付后请配置 BILLING_CHECKOUT_URL_MONTHLY / YEARLY。'
                                        : 'Start trial now. Configure BILLING_CHECKOUT_URL_MONTHLY / YEARLY to enable paid checkout.'}
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

