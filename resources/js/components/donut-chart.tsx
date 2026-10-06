import { fillGradient, gradientStops } from '@/lib/color';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { useId, useState } from 'react';

export interface DonutSlice {
    key: string;
    label: string;
    value: number;
    color: string;
    /** Bila diisi, klik pada slice/legenda menuju halaman ini. */
    href?: string;
    /**
     * Aksi khusus saat slice diklik — menggantikan perilaku bawaan (navigasi
     * bila ada `href`, selain itu mengunci sorotan). Dipakai mis. untuk
     * memecah slice gabungan menjadi rinciannya.
     */
    onSelect?: () => void;
    /** Keterangan tambahan pada tooltip bawaan browser. */
    hint?: string;
}

interface Props {
    slices: DonutSlice[];
    /** Teks kecil di bawah angka total pada bagian tengah (hanya varian donut). */
    centerCaption?: string;
    size?: number;
    thickness?: number;
    /**
     * `donut` — cincin dengan tebal seragam, besaran dibaca dari sudut saja.
     * `rose`  — sudut tetap mengikuti proporsi, tetapi jari-jari tiap slice
     *           ikut tumbuh mengikuti nilainya (Nightingale/rose chart).
     */
    variant?: 'donut' | 'rose';
    /** Batas tinggi legenda (px) sebelum ia bisa digulir — untuk daftar panjang. */
    maxLegendHeight?: number;
    emptyLabel?: string;
    className?: string;
}

/**
 * Titik pada lingkaran. Sudut 0 = arah jam 3; pemanggil memulai dari −90°
 * agar slice pertama dimulai dari puncak lingkaran.
 */
const point = (cx: number, cy: number, r: number, angle: number) => [
    cx + r * Math.cos(angle),
    cy + r * Math.sin(angle),
];

/** Path satu cincin-sektor (arc luar → sisi → arc dalam → tutup). */
function arcPath(cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number) {
    const large = end - start > Math.PI ? 1 : 0;
    const [x1, y1] = point(cx, cy, rOuter, start);
    const [x2, y2] = point(cx, cy, rOuter, end);
    const [x3, y3] = point(cx, cy, rInner, end);
    const [x4, y4] = point(cx, cy, rInner, start);

    return [
        `M ${x1} ${y1}`,
        `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4}`,
        'Z',
    ].join(' ');
}

/**
 * Donut interaktif.
 *
 * Ditulis sebagai SVG langsung, bukan lewat Recharts, karena yang dibutuhkan
 * di sini justru perilaku yang sulit dikendalikan lewat library: slice yang
 * terdorong keluar saat disorot, sinkron dua arah dengan legenda, bisa diklik
 * menuju daftar terfilter, dan tetap dapat dijangkau lewat keyboard.
 */
export function DonutChart({
    slices,
    centerCaption,
    size = 190,
    thickness = 26,
    variant = 'donut',
    maxLegendHeight,
    emptyLabel = 'Belum ada data.',
    className,
}: Props) {
    const isRose = variant === 'rose';
    const [hovered, setHovered] = useState<string | null>(null);
    const [pinned, setPinned] = useState<string | null>(null);
    // id unik per instance: beberapa donut bisa tampil di satu halaman dan
    // definisi gradiennya tidak boleh saling menimpa.
    const uid = useId().replace(/:/g, '');

    const total = slices.reduce((sum, s) => sum + s.value, 0);
    const drawn = slices.filter((s) => s.value > 0);
    const activeKey = hovered ?? pinned;
    const active = slices.find((s) => s.key === activeKey) ?? null;

    if (total === 0) {
        return (
            <div className={cn('flex flex-col items-center justify-center py-10 text-center', className)}>
                <div
                    className="rounded-full border-dashed border-muted-foreground/30"
                    style={{ width: size * 0.6, height: size * 0.6, borderWidth: thickness / 2 }}
                />
                <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
            </div>
        );
    }

    const cx = size / 2;
    const cy = size / 2;
    const rOuter = size / 2 - 8; // ruang sisa untuk dorongan slice saat disorot
    // Rose: hub kecil di pusat supaya ujung slice tidak menumpuk jadi satu titik.
    const rInner = isRose ? Math.round(size * 0.07) : rOuter - thickness;
    // Celah antar slice; dilewati bila hanya ada satu slice agar cincin tetap utuh.
    const gap = drawn.length > 1 ? 0.022 : 0;

    // Jari-jari terkecil pada rose diberi lantai agar slice bernilai kecil tetap
    // terbaca, bukan menyusut jadi sekadar sliver di tepi pusat.
    const maxValue = Math.max(...drawn.map((s) => s.value), 1);
    const roseRadius = (value: number) => rInner + (rOuter - rInner) * (0.4 + 0.6 * (value / maxValue));

    const activate = (s: DonutSlice) => {
        if (s.onSelect) {
            s.onSelect();
            return;
        }
        if (s.href) {
            router.visit(s.href);
            return;
        }
        setPinned((prev) => (prev === s.key ? null : s.key));
    };

    let cursor = -Math.PI / 2;
    const arcs = drawn.map((s) => {
        const sweep = (s.value / total) * Math.PI * 2;
        const start = cursor + gap / 2;
        const end = cursor + sweep - gap / 2;
        cursor += sweep;
        const mid = (start + end) / 2;
        return {
            slice: s,
            start,
            end,
            mid,
            share: (s.value / total) * 100,
            radius: isRose ? roseRadius(s.value) : rOuter,
        };
    });

    return (
        <div className={cn('flex flex-col items-center gap-4 sm:flex-row sm:items-center', className)}>
            <div className="flex shrink-0 flex-col items-center">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} role="img" aria-label={`Donut: ${slices.map((s) => `${s.label} ${s.value}`).join(', ')}`}>
                    {/* Satu gradien per slice, arah cahayanya sama untuk semua slice
                        (userSpaceOnUse) sehingga cincin terbaca sebagai satu bidang. */}
                    <defs>
                        {arcs.map(({ slice }, i) => {
                            const [light, dark] = gradientStops(slice.color);
                            return (
                                <linearGradient
                                    key={slice.key}
                                    id={`donut-${uid}-${i}`}
                                    gradientUnits="userSpaceOnUse"
                                    x1={0}
                                    y1={0}
                                    x2={size}
                                    y2={size}
                                >
                                    <stop offset="0%" stopColor={light} />
                                    <stop offset="100%" stopColor={dark} />
                                </linearGradient>
                            );
                        })}
                    </defs>
                    {arcs.map(({ slice, start, end, mid, share, radius }, i) => {
                        const isActive = activeKey === slice.key;
                        const dimmed = activeKey !== null && !isActive;
                        const push = isActive ? (isRose ? 8 : 5) : 0;
                        const [dx, dy] = [Math.cos(mid) * push, Math.sin(mid) * push];

                        // Satu slice penuh: arc dengan titik awal = titik akhir tidak
                        // tergambar, jadi dipakai lingkaran ber-stroke sebagai gantinya.
                        const isFullRing = drawn.length === 1;

                        const paint = `url(#donut-${uid}-${i})`;

                        const common = {
                            fill: 'none',
                            stroke: paint,
                            style: {
                                transform: `translate(${dx}px, ${dy}px)`,
                                transition: 'transform 180ms ease, opacity 180ms ease',
                                opacity: dimmed ? 0.35 : 1,
                                cursor: 'pointer',
                                outline: 'none',
                            } as const,
                            tabIndex: 0,
                            role: 'button',
                            'aria-label': `${slice.label}: ${slice.value} (${share.toFixed(0)}%)`,
                            onMouseEnter: () => setHovered(slice.key),
                            onMouseLeave: () => setHovered(null),
                            onFocus: () => setHovered(slice.key),
                            onBlur: () => setHovered(null),
                            onClick: () => activate(slice),
                            onKeyDown: (e: React.KeyboardEvent) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    activate(slice);
                                }
                            },
                        };

                        // Satu slice pada rose = lingkaran penuh; digambar sebagai
                        // cakram ber-fill, bukan cincin ber-stroke setebal `thickness`.
                        return isFullRing ? (
                            <circle
                                key={slice.key}
                                cx={cx}
                                cy={cy}
                                r={isRose ? radius : (rOuter + rInner) / 2}
                                {...common}
                                fill={isRose ? paint : 'none'}
                                stroke={isRose ? 'none' : paint}
                                strokeWidth={isRose ? undefined : thickness}
                            >
                                <title>{slice.hint ?? `${slice.label}: ${slice.value} (100%)`}</title>
                            </circle>
                        ) : (
                            <g key={slice.key} style={common.style}>
                                <path
                                    d={arcPath(cx, cy, radius, rInner, start, end)}
                                    fill={paint}
                                    stroke="none"
                                    style={{ cursor: 'pointer', outline: 'none' }}
                                    tabIndex={0}
                                    role="button"
                                    aria-label={common['aria-label']}
                                    onMouseEnter={common.onMouseEnter}
                                    onMouseLeave={common.onMouseLeave}
                                    onFocus={common.onFocus}
                                    onBlur={common.onBlur}
                                    onClick={common.onClick}
                                    onKeyDown={common.onKeyDown}
                                >
                                    <title>
                                        {slice.hint ?? `${slice.label}: ${slice.value} (${share.toFixed(0)}%)`}
                                    </title>
                                </path>

                                {/* Persentase ditulis di dalam slice bila ruangnya cukup. */}
                                {isRose && share >= 5 && end - start >= 0.3 && (
                                    <text
                                        x={cx + Math.cos(mid) * (rInner + (radius - rInner) * 0.66)}
                                        y={cy + Math.sin(mid) * (rInner + (radius - rInner) * 0.66)}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        className="pointer-events-none select-none"
                                        fontSize={10}
                                        fontWeight={700}
                                        fill="#ffffff"
                                        stroke="rgba(0,0,0,.3)"
                                        strokeWidth={2.5}
                                        paintOrder="stroke"
                                    >
                                        {share.toFixed(0)}%
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>

                {/* Bagian tengah: total, atau rincian slice yang sedang disorot/dipilih.
                    Rose tidak punya lubang di pusatnya, jadi keterangannya pindah ke
                    bawah chart agar tidak menutupi slice. */}
                {!isRose && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                        <span className="font-mono text-2xl font-extrabold leading-none tabular-nums">
                            {active ? active.value : total}
                        </span>
                        <span className="mt-1 line-clamp-2 text-[10px] uppercase leading-tight tracking-wider text-muted-foreground">
                            {active ? active.label : (centerCaption ?? 'total')}
                        </span>
                        {active && (
                            <span className="mt-0.5 text-[11px] font-semibold" style={{ color: active.color }}>
                                {((active.value / total) * 100).toFixed(0)}%
                            </span>
                        )}
                    </div>
                )}

            </div>

            {isRose && (
                    <div className="pointer-events-none mt-2 w-full text-center" style={{ maxWidth: size }}>
                        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-zinc-200 bg-background px-2.5 py-1 text-[11px] shadow-sm dark:border-zinc-700">
                            {active ? (
                                <>
                                    <span className="size-2 shrink-0 rounded-full" style={{ background: active.color }} />
                                    <span className="truncate font-medium">{active.label}</span>
                                    <span className="font-mono font-bold tabular-nums">{active.value}</span>
                                    <span className="text-muted-foreground">
                                        ({((active.value / total) * 100).toFixed(0)}%)
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="font-mono font-bold tabular-nums">{total}</span>
                                    <span className="text-muted-foreground">{centerCaption ?? 'total'}</span>
                                </>
                            )}
                        </span>
                    </div>
                )}
            </div>

            {/* Legenda: sinkron dua arah dengan slice, dan ikut bisa diklik. */}
            <ul
                className={cn('w-full min-w-0 space-y-0.5', maxLegendHeight && 'overflow-y-auto pr-1')}
                style={maxLegendHeight ? { maxHeight: maxLegendHeight } : undefined}
            >
                {slices.map((s) => {
                    const isActive = activeKey === s.key;
                    const share = total ? (s.value / total) * 100 : 0;
                    return (
                        <li key={s.key}>
                            <button
                                type="button"
                                title={s.hint}
                                onMouseEnter={() => setHovered(s.key)}
                                onMouseLeave={() => setHovered(null)}
                                onFocus={() => setHovered(s.key)}
                                onBlur={() => setHovered(null)}
                                onClick={() => activate(s)}
                                aria-pressed={pinned === s.key}
                                className={cn(
                                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c]/40',
                                    isActive ? 'bg-muted' : 'hover:bg-muted/60',
                                )}
                            >
                                <span
                                    className="size-2.5 shrink-0 rounded-full transition-transform duration-200"
                                    style={{
                                        background: fillGradient(s.color, 135),
                                        transform: isActive ? 'scale(1.35)' : undefined,
                                    }}
                                />
                                <span className={cn('min-w-0 flex-1 truncate', isActive && 'font-semibold')}>
                                    {s.label}
                                </span>
                                <span className="shrink-0 font-mono font-semibold tabular-nums">{s.value}</span>
                                <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                                    {share.toFixed(0)}%
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
