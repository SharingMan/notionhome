export type AppLocale = 'en' | 'zh-CN';

const ZH_COUNTRY_CODES = new Set(['CN', 'HK', 'MO', 'TW']);

const COUNTRY_HEADER_KEYS = [
    'x-vercel-ip-country',
    'cf-ipcountry',
    'x-geo-country',
    'x-country-code',
    'x-railway-country',
];

function getFirstHeaderValue(headers: Headers, keys: string[]): string | null {
    for (const key of keys) {
        const value = headers.get(key);
        if (value) return value;
    }
    return null;
}

export function detectLocaleFromHeaders(headers: Headers): AppLocale {
    const country = getFirstHeaderValue(headers, COUNTRY_HEADER_KEYS)?.trim().toUpperCase();
    if (country && ZH_COUNTRY_CODES.has(country)) {
        return 'zh-CN';
    }

    const acceptLanguage = headers.get('accept-language')?.toLowerCase() || '';
    if (acceptLanguage.includes('zh')) {
        return 'zh-CN';
    }

    return 'en';
}

export const messages = {
    en: {
        home: {
            badge: 'Now with real-time sync',
            titleMain: 'Notion Calendar',
            titleAccent: 'Reimagined',
            subtitle:
                'Seamlessly sync your Notion databases with Apple Calendar via ICS. Always up-to-date, secure, and beautiful.',
            connect: 'Connect Notion',
            mySubscriptions: 'My Subscriptions',
            github: 'View on GitHub',
            features: [
                {
                    title: 'Database Sync',
                    desc: 'Turn any Notion database into a subscribable calendar feed.',
                },
                {
                    title: 'Always Fresh',
                    desc: 'Changes in Notion reflect in your calendar instantly.',
                },
                {
                    title: 'Secure & Private',
                    desc: 'We only access the databases you explicitly share.',
                },
            ],
            footer: 'Notion Calendar Sync. Built for productivity.',
        },
        config: {
            title: 'Configure Calendar Sync',
            subtitle: 'Select the Notion database you want to sync with Apple Calendar.',
            errorTitle: 'Error connecting to Notion',
            checklistTitle: 'Checklist:',
            checklist1: 'Confirm this integration has Read content capability.',
            checklist2: 'Open the target database page and Share -> Add connections -> select your integration.',
            checklist3: 'Re-run OAuth from the homepage to get a fresh token.',
            emptyTitle: 'No accessible databases found',
            empty1: 'In Notion, open the database page you want to sync.',
            empty2: 'Click Share -> Add connections, then select your integration.',
            empty3: 'Return to homepage and run Connect Notion again.',
            form: {
                sourceLabel: 'Notion Database',
                sourcePlaceholder: 'Select a database...',
                mapTitle: 'Map Properties',
                eventTitleLabel: 'Event Title (Name)',
                eventTitlePlaceholder: 'Select property...',
                eventDateLabel: 'Event Date',
                eventDatePlaceholder: 'Select property...',
                eventDateHint: 'Must be a date property.',
                descriptionLabel: 'Description (Optional)',
                descriptionNone: 'None',
                feedReadyTitle: 'Calendar Feed Ready!',
                feedReadyHint: 'Copy this URL and subscribe to it in Apple Calendar (File -> New Calendar Subscription).',
                createButton: 'Generate Calendar URL',
                creatingButton: 'Creating Feed...',
                createError: 'Error creating feed',
                kindDatabase: 'Database',
                kindDataSource: 'Data Source',
            },
        },
    },
    'zh-CN': {
        home: {
            badge: '现已支持快速同步',
            titleMain: 'Notion 日历',
            titleAccent: '全新体验',
            subtitle: '通过 ICS 将 Notion 数据库同步到 Apple 日历。安全、稳定、体验更好。',
            connect: '连接 Notion',
            mySubscriptions: '我的订阅',
            github: '查看 GitHub',
            features: [
                {
                    title: '数据库同步',
                    desc: '把任意 Notion 数据库变成可订阅日历。',
                },
                {
                    title: '持续更新',
                    desc: 'Notion 变更会自动反映到日历中。',
                },
                {
                    title: '安全私密',
                    desc: '仅访问你明确授权的页面和数据库。',
                },
            ],
            footer: 'Notion Calendar Sync. 为效率而生。',
        },
        config: {
            title: '配置日历同步',
            subtitle: '选择要同步到 Apple 日历的 Notion 数据库。',
            errorTitle: '连接 Notion 失败',
            checklistTitle: '请检查：',
            checklist1: '该 Integration 已开启 Read content 权限。',
            checklist2: '目标数据库页面已 Share -> Add connections -> 选择该 Integration。',
            checklist3: '回到首页重新 Connect Notion 获取新授权。',
            emptyTitle: '未发现可访问的数据库',
            empty1: '在 Notion 打开你要同步的数据库页面。',
            empty2: '点击 Share -> Add connections，选择你的 Integration。',
            empty3: '回到首页重新执行 Connect Notion。',
            form: {
                sourceLabel: 'Notion 数据库',
                sourcePlaceholder: '请选择数据库...',
                mapTitle: '字段映射',
                eventTitleLabel: '事件标题',
                eventTitlePlaceholder: '请选择字段...',
                eventDateLabel: '事件日期',
                eventDatePlaceholder: '请选择字段...',
                eventDateHint: '必须是日期类型字段。',
                descriptionLabel: '事件描述（可选）',
                descriptionNone: '不设置',
                feedReadyTitle: '日历链接已生成！',
                feedReadyHint: '复制该链接后，在 Apple 日历中订阅（文件 -> 新建日历订阅）。',
                createButton: '生成日历链接',
                creatingButton: '正在生成...',
                createError: '创建失败，请重试',
                kindDatabase: '数据库',
                kindDataSource: '数据源',
            },
        },
    },
} as const;

export function getMessages(locale: AppLocale) {
    return messages[locale];
}
