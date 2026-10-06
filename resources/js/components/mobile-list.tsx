import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ChevronRight, Inbox } from 'lucide-react';
import * as React from 'react';

/**
 * Primitif daftar untuk tampilan mobile.
 *
 * Tabel desktop tidak bisa dibaca nyaman di layar sempit — kolom terpotong
 * atau memaksa scroll horizontal. Komponen ini menyajikan data yang sama
 * sebagai kartu yang bisa ditap. Dipakai bersama oleh semua halaman daftar
 * agar tampilannya konsisten.
 *
 * Semua komponen di sini murni presentasional: tidak mengambil data sendiri,
 * hanya menampilkan ulang data yang sudah dikirim halaman.
 */

export function MobileList({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('flex flex-col gap-2.5', className)}>{children}</div>;
}

export function MobileListEmpty({ message = 'Belum ada data.' }: { message?: string }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-200 py-10 text-center dark:border-zinc-800">
            <Inbox className="size-6 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">{message}</p>
        </div>
    );
}

export function MobileBadge({
    children,
    className,
    style,
}: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}) {
    return (
        <span
            className={cn(
                'inline-flex flex-none items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none',
                className,
            )}
            style={style}
        >
            {children}
        </span>
    );
}

export function MobileMeta({ icon: Icon, children }: { icon?: React.ElementType; children: React.ReactNode }) {
    if (children === null || children === undefined || children === '') return null;
    return (
        <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
            {Icon && <Icon className="size-3 flex-none" />}
            <span className="truncate">{children}</span>
        </span>
    );
}

/**
 * Kartu daftar. Bila `href` diisi, seluruh kartu menjadi tautan —
 * target sentuh besar, sesuai pedoman mobile.
 */
export function MobileListCard({
    href,
    code,
    title,
    badges,
    meta,
    footer,
    accent,
    onClick,
}: {
    href?: string | null;
    code?: React.ReactNode;
    title: React.ReactNode;
    badges?: React.ReactNode;
    meta?: React.ReactNode;
    footer?: React.ReactNode;
    /** Garis aksen kiri, mis. untuk menandai severity. */
    accent?: string;
    onClick?: () => void;
}) {
    const body = (
        <div
            className={cn(
                'rounded-2xl border border-zinc-200/70 bg-white/80 p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60',
                (href || onClick) && 'transition-transform active:scale-[0.985]',
            )}
            style={accent ? { borderLeftWidth: 3, borderLeftColor: accent } : undefined}
        >
            <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                    {code && (
                        <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                            {code}
                        </div>
                    )}
                    <div className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">{title}</div>
                </div>
                {badges && <div className="flex flex-none flex-col items-end gap-1">{badges}</div>}
                {(href || onClick) && (
                    <ChevronRight className="mt-0.5 size-4 flex-none text-muted-foreground/60" />
                )}
            </div>

            {meta && <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">{meta}</div>}
            {footer && <div className="mt-2.5">{footer}</div>}
        </div>
    );

    if (href) {
        return (
            <Link href={href} prefetch className="block">
                {body}
            </Link>
        );
    }
    if (onClick) {
        return (
            <button type="button" onClick={onClick} className="block w-full text-left">
                {body}
            </button>
        );
    }
    return body;
}

/**
 * Format tanggal ringkas untuk kartu mobile.
 *
 * Sebagian endpoint mengirim ISO penuh (`2026-06-11T17:00:00.000000Z`),
 * sebagian sudah `YYYY-MM-DD`. Di layar sempit ISO penuh memakan ruang dan
 * sulit dibaca, jadi keduanya dinormalkan ke bentuk pendek berbahasa Indonesia.
 * Nilai yang tidak bisa diurai dikembalikan apa adanya agar tidak ada data hilang.
 */
export function mobileDate(value?: string | null, fallback = '—'): string {
    if (!value) return fallback;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Paginasi ringkas untuk daftar mobile. */
export function MobilePager({
    page,
    lastPage,
    prevUrl,
    nextUrl,
    summary,
}: {
    page: number;
    lastPage: number;
    prevUrl?: string | null;
    nextUrl?: string | null;
    summary?: string;
}) {
    const btn =
        'inline-flex min-h-[40px] items-center justify-center rounded-xl border border-zinc-200 px-4 text-xs font-medium dark:border-zinc-800';
    const disabled = 'cursor-not-allowed opacity-40';

    return (
        <div className="mt-3 flex flex-col items-center gap-2">
            {summary && <span className="text-[11px] text-muted-foreground">{summary}</span>}
            <div className="flex w-full items-center justify-between gap-2">
                {prevUrl ? (
                    <Link href={prevUrl} preserveScroll preserveState className={btn}>
                        Sebelumnya
                    </Link>
                ) : (
                    <span className={cn(btn, disabled)}>Sebelumnya</span>
                )}
                <span className="text-[11px] tabular-nums text-muted-foreground">
                    {page} / {lastPage}
                </span>
                {nextUrl ? (
                    <Link href={nextUrl} preserveScroll preserveState className={btn}>
                        Berikutnya
                    </Link>
                ) : (
                    <span className={cn(btn, disabled)}>Berikutnya</span>
                )}
            </div>
        </div>
    );
}

/** Bar progres tipis untuk menunjukkan proporsi (mis. temuan tertutup). */
export function MobileProgress({ value, color }: { value: number; color: string }) {
    const v = Math.min(Math.max(value, 0), 100);
    return (
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full rounded-full" style={{ width: `${v}%`, background: color }} />
        </div>
    );
}
