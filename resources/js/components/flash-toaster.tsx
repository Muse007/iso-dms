import { usePage } from '@inertiajs/react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

type Flash = { success?: string | null; error?: string | null };

export function FlashToaster() {
    const { props } = usePage<{ flash?: Flash }>();
    const flash = props.flash ?? {};
    const [items, setItems] = useState<Array<{ id: number; kind: 'success' | 'error'; text: string }>>([]);

    useEffect(() => {
        const next: typeof items = [];
        if (flash.success) next.push({ id: Date.now(), kind: 'success', text: flash.success });
        if (flash.error)   next.push({ id: Date.now() + 1, kind: 'error',   text: flash.error });
        if (next.length === 0) return;

        setItems((prev) => [...prev, ...next]);
        const t = setTimeout(() => {
            setItems((prev) => prev.filter((i) => !next.find((n) => n.id === i.id)));
        }, 4000);
        return () => clearTimeout(t);
    }, [flash.success, flash.error]);

    if (items.length === 0) return null;
    return (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
            {items.map((it) => (
                <div
                    key={it.id}
                    className={`pointer-events-auto flex items-start gap-3 rounded-lg border bg-card p-3 shadow-lg ${
                        it.kind === 'success' ? 'border-emerald-500/30' : 'border-red-500/30'
                    }`}
                >
                    {it.kind === 'success' ? (
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
                    ) : (
                        <XCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
                    )}
                    <div className="flex-1 text-sm">{it.text}</div>
                    <button
                        onClick={() => setItems((prev) => prev.filter((i) => i.id !== it.id))}
                        className="rounded p-0.5 hover:bg-muted"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}
