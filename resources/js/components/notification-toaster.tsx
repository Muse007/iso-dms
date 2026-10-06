import { type NotificationItem, type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { AlertTriangle, Bell, CheckCircle2, CircleDot, Info, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const POLL_MS = 25_000;
const DISMISS_MS = 9_000;

const iconOf: Record<string, typeof Info> = {
    action: CircleDot,
    warning: AlertTriangle,
    success: CheckCircle2,
    info: Info,
};
const accentOf: Record<string, string> = {
    action: 'border-l-[#b91c1c] text-[#b91c1c]',
    warning: 'border-l-amber-500 text-amber-600',
    success: 'border-l-emerald-500 text-emerald-600',
    info: 'border-l-sky-500 text-sky-600',
};

export function NotificationToaster() {
    const { notifications } = usePage<SharedData>().props;
    const items: NotificationItem[] = notifications?.items ?? [];

    const seen = useRef<Set<string> | null>(null);
    const [toasts, setToasts] = useState<NotificationItem[]>([]);

    // Polling ringan — hanya saat tab aktif.
    useEffect(() => {
        const tick = () => {
            if (!document.hidden) {
                router.reload({ only: ['notifications'], preserveScroll: true, preserveState: true });
            }
        };
        const id = window.setInterval(tick, POLL_MS);
        return () => window.clearInterval(id);
    }, []);

    // Deteksi notifikasi baru untuk dipop-up.
    useEffect(() => {
        if (seen.current === null) {
            // Seed pertama: jangan pop-up backlog yang sudah ada saat halaman dibuka.
            seen.current = new Set(items.map((i) => i.id));
            return;
        }
        const fresh = items.filter((i) => !seen.current!.has(i.id) && !i.read);
        items.forEach((i) => seen.current!.add(i.id));
        if (fresh.length === 0) return;

        setToasts((prev) => [...fresh.reverse(), ...prev].slice(0, 4));
        const timers = fresh.map((f) =>
            window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== f.id)), DISMISS_MS),
        );
        return () => timers.forEach(clearTimeout);
    }, [items]);

    const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

    if (toasts.length === 0) return null;

    return (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
            {toasts.map((t) => {
                const Icon = iconOf[t.type] ?? Bell;
                const accent = accentOf[t.type] ?? accentOf.info;
                return (
                    <div
                        key={t.id}
                        role="alert"
                        className={`pointer-events-auto flex items-start gap-3 rounded-lg border border-l-4 bg-card p-3 shadow-xl ${accent}`}
                    >
                        <Icon className="mt-0.5 size-5 shrink-0" />
                        <button
                            onClick={() => {
                                dismiss(t.id);
                                if (t.url) router.visit(`/notifications/${t.id}/go`);
                            }}
                            className="min-w-0 flex-1 text-left"
                        >
                            <div className="text-sm font-semibold text-foreground">{t.title}</div>
                            <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.body}</div>
                            {t.url && <div className="mt-1 text-[11px] font-medium text-[#b91c1c]">Lihat detail →</div>}
                        </button>
                        <button
                            onClick={() => dismiss(t.id)}
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                            aria-label="Tutup"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
