'use client';
import { useState } from 'react';

interface ConfigFormProps {
    feed: any; // Prisma Feed model
    databases: any[];
}

function getSourceLabel(source: any): string {
    const titleFromTitleArray = source?.title?.[0]?.plain_text;
    const titleFromRichName = source?.name?.[0]?.plain_text;
    const title = titleFromTitleArray || titleFromRichName || 'Untitled';
    const kind = source?.object === 'data_source' ? 'Data Source' : 'Database';
    return `${title} (${kind})`;
}

export default function ConfigForm({ feed, databases }: ConfigFormProps) {
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
            alert('Error creating feed');
        } finally {
            setLoading(false);
        }
    };

    if (generatedUrl) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-semibold text-green-600">Calendar Feed Ready!</h2>
                <div className="bg-gray-100 p-4 rounded-md border border-gray-200 break-all font-mono text-sm">
                    {generatedUrl}
                </div>
                <p className="text-sm text-gray-500">
                    Copy this URL and subscribe to it in Apple Calendar (File &rarr; New Calendar Subscription).
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notion Database</label>
                <select
                    value={selectedDbId}
                    onChange={(e) => setSelectedDbId(e.target.value)}
                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                >
                    <option value="">Select a database...</option>
                    {databases.map((db) => (
                        <option key={db.id} value={db.id}>
                            {getSourceLabel(db)}
                        </option>
                    ))}
                </select>
            </div>

            {selectedDatabase && (
                <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900">Map Properties</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Event Title (Name)</label>
                        <select
                            value={mappings.name}
                            onChange={(e) => setMappings({ ...mappings, name: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                        >
                            <option value="">Select property...</option>
                            {Object.entries((selectedDatabase as any).properties)
                                .filter(([, prop]: any) => prop.type === 'title' || prop.type === 'rich_text')
                                .map(([key]: any) => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Event Date</label>
                        <select
                            value={mappings.date}
                            onChange={(e) => setMappings({ ...mappings, date: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                        >
                            <option value="">Select property...</option>
                            {Object.entries((selectedDatabase as any).properties)
                                .filter(([, prop]: any) => prop.type === 'date')
                                .map(([key]: any) => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Must be a date property.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                        <select
                            value={mappings.description}
                            onChange={(e) => setMappings({ ...mappings, description: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                            <option value="">None</option>
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
                {loading ? 'Creating Feed...' : 'Generate Calendar URL'}
            </button>
        </form>
    );
}
