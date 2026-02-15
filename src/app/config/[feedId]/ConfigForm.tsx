'use client';
import { useState } from 'react';
import type { AppLocale } from '@/lib/i18n';
import { getMessages } from '@/lib/i18n';

interface ConfigFormProps {
    feed: any; // Prisma Feed model
    databases: any[];
    locale: AppLocale;
}

function getSourceLabel(source: any, locale: AppLocale): string {
    const titleFromTitleArray = source?.title?.[0]?.plain_text;
    const titleFromRichName = source?.name?.[0]?.plain_text;
    const title = titleFromTitleArray || titleFromRichName || 'Untitled';
    const texts = getMessages(locale).config.form;
    const kind = source?.object === 'data_source' ? texts.kindDataSource : texts.kindDatabase;
    return `${title} (${kind})`;
}

export default function ConfigForm({ feed, databases, locale }: ConfigFormProps) {
    const t = getMessages(locale).config.form;

    const [selectedDbId, setSelectedDbId] = useState<string>('');
    const [mappings, setMappings] = useState({
        name: '',
        date: '',
        description: '',
    });
    const [loading, setLoading] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

    const selectedDatabase = databases.find((db) => db.id === selectedDbId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`/api/config/${feed.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    databaseId: selectedDbId,
                    mappings,
                }),
            });

            if (!res.ok) throw new Error('Failed to save config');
            const data = await res.json();
            setGeneratedUrl(data.url);
        } catch (err) {
            console.error(err);
            alert(t.createError);
        } finally {
            setLoading(false);
        }
    };

    if (generatedUrl) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-semibold text-green-600">{t.feedReadyTitle}</h2>
                <div className="bg-gray-100 p-4 rounded-md border border-gray-200 break-all font-mono text-sm">
                    {generatedUrl}
                </div>
                <p className="text-sm text-gray-500">
                    {t.feedReadyHint}
                </p>
                <div className="flex flex-wrap gap-2">
                    <a
                        href={generatedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    >
                        {t.feedReadyOpen}
                    </a>
                    <a
                        href="/my"
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                        {t.feedReadyManage}
                    </a>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.sourceLabel}</label>
                <select
                    value={selectedDbId}
                    onChange={(e) => setSelectedDbId(e.target.value)}
                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                >
                    <option value="">{t.sourcePlaceholder}</option>
                    {databases.map((db) => (
                        <option key={db.id} value={db.id}>
                            {getSourceLabel(db, locale)}
                        </option>
                    ))}
                </select>
            </div>

            {selectedDatabase && (
                <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900">{t.mapTitle}</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t.eventTitleLabel}</label>
                        <select
                            value={mappings.name}
                            onChange={(e) => setMappings({ ...mappings, name: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                        >
                            <option value="">{t.eventTitlePlaceholder}</option>
                            {Object.entries((selectedDatabase as any).properties)
                                .filter(([, prop]: any) => prop.type === 'title' || prop.type === 'rich_text')
                                .map(([key]: any) => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t.eventDateLabel}</label>
                        <select
                            value={mappings.date}
                            onChange={(e) => setMappings({ ...mappings, date: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                        >
                            <option value="">{t.eventDatePlaceholder}</option>
                            {Object.entries((selectedDatabase as any).properties)
                                .filter(([, prop]: any) => prop.type === 'date')
                                .map(([key]: any) => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">{t.eventDateHint}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t.descriptionLabel}</label>
                        <select
                            value={mappings.description}
                            onChange={(e) => setMappings({ ...mappings, description: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                            <option value="">{t.descriptionNone}</option>
                            {Object.entries((selectedDatabase as any).properties)
                                .filter(([, prop]: any) => prop.type === 'rich_text')
                                .map(([key]: any) => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                        </select>
                    </div>
                </div>
            )}

            <button
                type="submit"
                disabled={loading || !selectedDbId || !mappings.name || !mappings.date}
                className="w-full bg-black text-white py-3 px-4 rounded-md font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-all shadow-lg"
            >
                {loading ? t.creatingButton : t.createButton}
            </button>
        </form>
    );
}
