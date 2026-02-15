export type FeedMappings = {
    name?: string;
    date?: string;
    description?: string;
};

export function parseFeedMappings(raw: string): FeedMappings {
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        const value = parsed as Record<string, unknown>;
        return {
            name: typeof value.name === 'string' ? value.name : undefined,
            date: typeof value.date === 'string' ? value.date : undefined,
            description: typeof value.description === 'string' ? value.description : undefined,
        };
    } catch {
        return {};
    }
}

export function serializeFeedMappings(mappings: FeedMappings): string {
    const normalized: FeedMappings = {
        name: mappings.name?.trim() || undefined,
        date: mappings.date?.trim() || undefined,
        description: mappings.description?.trim() || undefined,
    };
    return JSON.stringify(normalized);
}

