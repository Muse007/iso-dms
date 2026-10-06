import { fillGradient } from '@/lib/color';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { MouseEvent, useRef, useState } from 'react';

export interface StackSegment {
    key: string;
    label: string;
    color: string;
}

export interface StackRow {
    key: string;
    label: string;
    /** Nilai per segmen, dikunci dengan StackSegment.key. */
    values: Record<string, number>;
    /** Bila diisi, klik pada baris menuju halaman ini. */
    href?: string;
    /** Tandai baris sebagai sedang dipakai sebagai filter. */
    active?: boolean;
}

interface Props {
    segments: StackSegment[];
    rows: StackRow[];
    /** Satuan yang muncul di tooltip, mis. "temuan". */
    unit?: string;
    /** Teks kecil di kanan bawah, mis. petunjuk klik. */
    hint?: string;
    emptyLabel?: string;
    className?: string;
}

const AXIS_TICKS = [0, 25, 50, 75, 100];

/** Ambang lebar segmen (persen) sebelum label persentase muat ditulis di dalamnya. */
const LABEL_MIN_SHARE = 9;

/**
 * Percent stacked bar horizontal.
 *
 * Setiap baris dinormalkan ke 100% supaya komposisi antar baris langsung bisa
 * dibandingkan; besaran absolutnya tetap terbaca lewat angka total di ujung
 * kanan dan lewat tooltip. Menyorot legenda meredupkan segmen lain di seluruh
 * baris, seperti perilaku legenda pada chart interaktif pada umumnya.
 */
export function PercentStackedBars({
    segments,
    rows,
    unit = 'item',
    hint,
    emptyLabel = 'Belum ada data.',
    className,
}: Props) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [legendKey, setLegendKey] = useState<string | null>(null);
    const [hover, setHover] = useState<{ row: StackRow; seg: StackSegment; value: number; share: number } | null>(null);
    const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

    const totalOf = (r: StackRow) => segments.reduce((sum, s) => sum + (r.values[s.key] ?? 0), 0);
    const visible = rows.filter((r) => totalOf(r) > 0);

    if (visible.length === 0) {
        return <div className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</div>;
    }

    const track = (e: MouseEvent) => {
        const box = wrapRef.current?.getBoundingClientRect();
        if (!box) return;
        setTip({ x: e.clientX - box.left, y: e.clientY - box.top });
    };

    const clear = () => {
        setHover(null);
        setTip(null);
    };

    return (
        <div className={cn('relative', className)} ref={wrapRef} onMouseLeave={clear}>
            {/* Legenda — menyorot satu kategori di seluruh baris sekaligus. */}
            <div className="mb-3 flex flex-wrap items-center justify-center gap-1">
                {segments.map((s) => {
                    const dim = legendKey !== null && legendKey !== s.key;
                    return (
                        <button
                            key={s.key}
                            type="button"
                            onMouseEnter={() => setLegendKey(s.key)}
                            onMouseLeave={() => setLegendKey(null)}
                            onFocus={() => setLegendKey(s.key)}
                            onBlur={() => setLegendKey(null)}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c]/40',
                                dim ? 'opacity-40' : 'hover:bg-muted',
                            )}
                        >
                            <span
                                className="size-2.5 rounded-sm transition-transform duration-200"
                                style={{
                                    background: fillGradient(s.color, 135),
                                    transform: legendKey === s.key ? 'scale(1.3)' : undefined,
                                }}
                            />
                            {s.label}
                        </button>
                    );
                })}
            </div>

            <div className="space-y-1">
                {visible.map((row) => {
                    const total = totalOf(row);
                    const clickable = !!row.href;

                    return (
                        <div
                            key={row.key}
                            role={clickable ? 'button' : undefined}
                            tabIndex={clickable ? 0 : undefined}
                            onClick={() => row.href && router.visit(row.href, { preserveScroll: true, preserveState: true })}
                            onKeyDown={(e) => {
                                if (row.href && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault();
                                    router.visit(row.href, { preserveScroll: true, preserveState: true });
                                }
                            }}
                            className={cn(
                                'group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c]/40',
                                clickable ? 'cursor-pointer hover:bg-muted/60' : 'cursor-default',
                                row.active && 'bg-muted ring-1 ring-[#b91c1c]/30',
                            )}
                        >
                            <span
                                className={cn(
                                    'w-28 shrink-0 truncate text-right text-[11px] sm:w-40',
                                    row.active ? 'font-semibold' : 'text-muted-foreground',
                                )}
                                title={row.label}
                            >
                                {row.label}
                            </span>

                            <span className="relative flex h-6 min-w-0 flex-1 overflow-hidden rounded-md bg-muted">
                                {/* Garis bantu 25% · 50% · 75% */}
                                {AXIS_TICKS.slice(1, -1).map((t) => (
                                    <span
                                        key={t}
                                        className="pointer-events-none absolute inset-y-0 z-10 w-px bg-background/50"
                                        style={{ left: `${t}%` }}
                                    />
                                ))}

                                {segments.map((seg) => {
                                    const value = row.values[seg.key] ?? 0;
                                    if (value <= 0) return null;

                                    const share = (value / total) * 100;
                                    const isHovered = hover?.row.key === row.key && hover.seg.key === seg.key;
                                    const dimmed =
                                        (legendKey !== null && legendKey !== seg.key) ||
                                        (hover !== null && !isHovered && hover.row.key === row.key);

                                    return (
                                        <span
                                            key={seg.key}
                                            onMouseEnter={() => setHover({ row, seg, value, share })}
                                            onMouseMove={track}
                                            className="relative flex items-center justify-center overflow-hidden transition-[filter,opacity] duration-150"
                                            style={{
                                                width: `${share}%`,
                                                // Gradien vertikal tipis: warna dasar tetap terbaca,
                                                // tetapi bidangnya tidak terlihat rata seperti blok cat.
                                                background: fillGradient(seg.color),
                                                opacity: dimmed ? 0.35 : 1,
                                                filter: isHovered ? 'brightness(1.15)' : undefined,
                                                boxShadow: isHovered ? 'inset 0 0 0 2px rgba(255,255,255,.85)' : undefined,
                                            }}
                                        >
                                            {share >= LABEL_MIN_SHARE && (
                                                <span className="select-none text-[10px] font-semibold tabular-nums text-white/95">
                                                    {share.toFixed(0)}%
                                                </span>
                                            )}
                                        </span>
                                    );
                                })}
                            </span>

                            {/* Besaran absolut tetap ditampilkan karena bar sudah dinormalkan ke 100%. */}
                            <span className="w-8 shrink-0 text-right font-mono text-[11px] font-semibold tabular-nums text-muted-foreground transition-colors group-hover:text-foreground">
                                {total}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Sumbu */}
            <div className="mt-1 flex items-center gap-3 px-2">
                <span className="w-28 shrink-0 sm:w-40" />
                <span className="relative flex min-w-0 flex-1 justify-between text-[10px] tabular-nums text-muted-foreground">
                    {AXIS_TICKS.map((t) => (
                        <span key={t}>{t}%</span>
                    ))}
                </span>
                <span className="w-8 shrink-0" />
            </div>

            {hint && <div className="mt-2 text-right text-[11px] text-muted-foreground">{hint}</div>}

            {/* Tooltip mengikuti kursor */}
            {hover && tip && (
                <div
                    className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95"
                    style={{ left: tip.x, top: tip.y }}
                >
                    <div className="font-semibold">{hover.row.label}</div>
                    <div className="mt-0.5 flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: hover.seg.color }} />
                        <span className="text-muted-foreground">{hover.seg.label}</span>
                        <span className="ml-auto font-mono font-semibold tabular-nums">
                            {hover.value} {unit}
                        </span>
                    </div>
                    <div className="mt-0.5 text-right text-[10px] text-muted-foreground">
                        {hover.share.toFixed(1)}% dari {totalOf(hover.row)}
                    </div>
                </div>
            )}
        </div>
    );
}
