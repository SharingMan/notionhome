'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

type CopyUrlButtonProps = {
    url: string;
    copyLabel: string;
    copiedLabel: string;
};

export default function CopyUrlButton({ url, copyLabel, copiedLabel }: CopyUrlButtonProps) {
    const [copied, setCopied] = useState(false);

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            setCopied(false);
        }
    };

    return (
        <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900"
        >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? copiedLabel : copyLabel}
        </button>
    );
}

