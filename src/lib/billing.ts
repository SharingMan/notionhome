import { PlanTier } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const DEFAULT_FREE_PLAN_MAX_FEEDS = 1;
const DEFAULT_TRIAL_DAYS = 14;

function getFreePlanMaxFeeds(): number {
    const raw = Number(process.env.FREE_PLAN_MAX_FEEDS);
    if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_FREE_PLAN_MAX_FEEDS;
    return Math.floor(raw);
}

export function getTrialDays(): number {
    const raw = Number(process.env.PREMIUM_TRIAL_DAYS);
    if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TRIAL_DAYS;
    return Math.floor(raw);
}

function isPremiumActive(tier: PlanTier, periodEndsAt: Date | null): boolean {
    if (tier !== PlanTier.PREMIUM) return false;
    if (!periodEndsAt) return true;
    return periodEndsAt.getTime() > Date.now();
}

export async function getOrCreateOwnerPlan(ownerKey: string) {
    return prisma.ownerPlan.upsert({
        where: { ownerKey },
        create: {
            ownerKey,
            tier: PlanTier.FREE,
            source: 'default',
        },
        update: {},
    });
}

export async function getOwnerPlanSummary(ownerKey: string) {
    const [plan, feedCount] = await Promise.all([
        getOrCreateOwnerPlan(ownerKey),
        prisma.feed.count({ where: { ownerKey } }),
    ]);

    const premiumActive = isPremiumActive(plan.tier, plan.periodEndsAt);
    const maxFeeds = premiumActive ? Number.POSITIVE_INFINITY : getFreePlanMaxFeeds();
    const canCreateFeed = premiumActive || feedCount < maxFeeds;

    return {
        ownerKey,
        tier: premiumActive ? PlanTier.PREMIUM : PlanTier.FREE,
        source: plan.source,
        periodEndsAt: plan.periodEndsAt,
        trialUsedAt: plan.trialUsedAt,
        feedCount,
        maxFeeds,
        canCreateFeed,
        premiumActive,
    };
}

export async function startTrialForOwner(ownerKey: string) {
    const existing = await getOrCreateOwnerPlan(ownerKey);
    if (existing.trialUsedAt) {
        return { ok: false as const, reason: 'trial_already_used' as const };
    }

    const now = new Date();
    const trialDays = getTrialDays();
    const periodEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    await prisma.ownerPlan.update({
        where: { ownerKey },
        data: {
            tier: PlanTier.PREMIUM,
            source: 'trial',
            trialUsedAt: now,
            periodEndsAt,
        },
    });

    return { ok: true as const, periodEndsAt, trialDays };
}

export async function activatePremiumByPayPal(input: {
    ownerKey: string;
    subscriptionId: string;
    subscriptionStatus?: string;
    planId?: string;
    payerId?: string;
}) {
    await prisma.ownerPlan.upsert({
        where: { ownerKey: input.ownerKey },
        create: {
            ownerKey: input.ownerKey,
            tier: PlanTier.PREMIUM,
            source: 'paypal',
            periodEndsAt: null,
            paypalSubscriptionId: input.subscriptionId,
            paypalSubscriptionStatus: input.subscriptionStatus,
            paypalPlanId: input.planId,
            paypalPayerId: input.payerId,
        },
        update: {
            tier: PlanTier.PREMIUM,
            source: 'paypal',
            periodEndsAt: null,
            paypalSubscriptionId: input.subscriptionId,
            paypalSubscriptionStatus: input.subscriptionStatus,
            paypalPlanId: input.planId,
            paypalPayerId: input.payerId,
        },
    });
}

export async function syncPremiumStatusByPayPalSubscription(input: {
    subscriptionId: string;
    status?: string;
    ownerKey?: string;
    planId?: string;
    payerId?: string;
}) {
    const ownerPlan = input.ownerKey
        ? await prisma.ownerPlan.findUnique({ where: { ownerKey: input.ownerKey } })
        : await prisma.ownerPlan.findFirst({ where: { paypalSubscriptionId: input.subscriptionId } });

    if (!ownerPlan && !input.ownerKey) return;
    const ownerKey = input.ownerKey || ownerPlan?.ownerKey;
    if (!ownerKey) return;

    const status = (input.status || '').toUpperCase();
    const isActive = status === 'ACTIVE' || status === 'APPROVAL_PENDING';

    await prisma.ownerPlan.upsert({
        where: { ownerKey },
        create: {
            ownerKey,
            tier: isActive ? PlanTier.PREMIUM : PlanTier.FREE,
            source: 'paypal',
            periodEndsAt: null,
            paypalSubscriptionId: input.subscriptionId,
            paypalSubscriptionStatus: input.status,
            paypalPlanId: input.planId,
            paypalPayerId: input.payerId,
        },
        update: {
            tier: isActive ? PlanTier.PREMIUM : PlanTier.FREE,
            source: 'paypal',
            periodEndsAt: null,
            paypalSubscriptionId: input.subscriptionId,
            paypalSubscriptionStatus: input.status,
            paypalPlanId: input.planId,
            paypalPayerId: input.payerId,
        },
    });
}
