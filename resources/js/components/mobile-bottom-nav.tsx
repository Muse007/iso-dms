import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { FileText, LayoutDashboard, LineChart, SearchCheck, User } from 'lucide-react';

type NavItem = {
    label: string;
    url: string;
    icon: typeof LayoutDashboard;
    /** Cocokkan juga sub-route, mis. /audits/12 tetap menandai tab Audit. */
    match?: string;
};

/** Tab kiri dan kanan; Audit berdiri sendiri sebagai tombol tengah. */
const LEFT: NavItem[] = [
    { label: 'Home', url: '/dashboard', icon: LayoutDashboard },
    { label: 'Dokumen', url: '/documents', icon: FileText, match: '/documents' },
];

const RIGHT: NavItem[] = [
    { label: 'Laporan', url: '/kpis', icon: LineChart, match: '/kpis' },
    { label: 'Profil', url: '/settings/profile', icon: User, match: '/settings' },
];

const CENTER: NavItem = { label: 'Audit', url: '/audits', icon: SearchCheck, match: '/audits' };

/** Tinggi bar tanpa safe-area — dipakai juga oleh spacer di layout. */
export const MOBILE_NAV_HEIGHT = 64;

function isActive(url: string, item: NavItem) {
    const base = item.match ?? item.url;
    return item.match ? url.startsWith(base) : url === item.url || url.startsWith(item.url + '?');
}

function Tab({ item, active }: { item: NavItem; active: boolean }) {
    const Icon = item.icon;
    return (
        <Link
            href={item.url}
            prefetch
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 transition-colors',
                active ? 'text-white' : 'text-white/65 hover:text-white/90',
            )}
        >
            <span className="relative">
                <Icon className="size-5" strokeWidth={active ? 2.5 : 1.9} />
                {active && (
                    <span className="absolute -top-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white" />
                )}
            </span>
            <span className={cn('text-[10px] leading-none', active && 'font-semibold')}>{item.label}</span>
        </Link>
    );
}

/**
 * Bottom tab bar mobile — gradasi merah dengan tombol Audit menonjol di tengah.
 *
 * `position: fixed` membuatnya menempel di viewport, bukan pada dokumen, jadi
 * ia tetap diam saat halaman digulir. Agar itu benar-benar terjaga, tidak boleh
 * ada ancestor yang membuat containing block baru (transform/filter/will-change)
 * — sudah diverifikasi tidak ada.
 */
export function MobileBottomNav() {
    const url = usePage().url;
    const centerActive = isActive(url, CENTER);
    const CenterIcon = CENTER.icon;

    return (
        <nav
            aria-label="Navigasi utama"
            className="fixed inset-x-0 bottom-0 z-50 md:hidden"
            style={{
                // Gradasi merah brand — gelap di tepi, terang di tengah,
                // sehingga tombol Audit di tengah terbaca sebagai fokus.
                backgroundImage: 'linear-gradient(90deg,#7f1d1d 0%,#b91c1c 35%,#dc2626 50%,#b91c1c 65%,#7f1d1d 100%)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                boxShadow: '0 -6px 24px -8px rgba(127,29,29,.55)',
            }}
        >
            {/* Garis kilau tipis di tepi atas agar bar terasa terangkat */}
            <div aria-hidden className="h-px w-full bg-white/25" />

            <div className="relative grid grid-cols-5 items-center">
                {LEFT.map((item) => (
                    <Tab key={item.label} item={item} active={isActive(url, item)} />
                ))}

                {/* Kolom tengah dibiarkan kosong; tombol Audit mengambang di atasnya
                    agar lingkarannya bisa menonjol keluar dari bar. */}
                <div aria-hidden className="min-h-[56px]" />

                {RIGHT.map((item) => (
                    <Tab key={item.label} item={item} active={isActive(url, item)} />
                ))}

                {/* Tombol Audit — FAB bulat menonjol.
                    Lekukan gelap di belakang tombol membuatnya terbaca seolah
                    menembus bar, bukan sekadar menumpuk di atasnya. */}
                <Link
                    href={CENTER.url}
                    prefetch
                    aria-current={centerActive ? 'page' : undefined}
                    aria-label={CENTER.label}
                    className="group absolute left-1/2 flex -translate-x-1/2 -translate-y-3 flex-col items-center"
                >
                    <span className="relative flex items-center justify-center">
                        {/* Cincin denyut saat tab Audit aktif */}
                        {centerActive && (
                            <span
                                aria-hidden
                                className="absolute size-16 animate-ping rounded-full bg-white/25"
                                style={{ animationDuration: '2.4s' }}
                            />
                        )}

                        {/* Halo lembut agar tombol tampak bercahaya di atas gradasi */}
                        <span
                            aria-hidden
                            className="absolute size-[68px] rounded-full"
                            style={{ background: 'radial-gradient(circle, rgba(255,255,255,.38) 0%, transparent 68%)' }}
                        />

                        {/* Cincin luar mengikuti warna bar agar menyatu */}
                        <span className="absolute size-[62px] rounded-full bg-gradient-to-b from-[#dc2626] to-[#7f1d1d]" />

                        {/* Badan tombol */}
                        <span
                            className={cn(
                                'relative flex size-14 items-center justify-center rounded-full',
                                'bg-gradient-to-br from-white via-white to-[#fee2e2]',
                                'text-[#b91c1c] transition-transform duration-200',
                                'group-active:scale-90',
                            )}
                            style={{
                                boxShadow:
                                    '0 12px 28px -8px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.95), inset 0 -2px 6px rgba(185,28,28,.18)',
                            }}
                        >
                            <CenterIcon className="size-[26px]" strokeWidth={centerActive ? 2.7 : 2.2} />
                        </span>
                    </span>

                    <span
                        className={cn(
                            'mt-1.5 text-[10px] leading-none tracking-wide text-white',
                            centerActive ? 'font-bold' : 'font-medium',
                        )}
                    >
                        {CENTER.label}
                    </span>
                </Link>
            </div>
        </nav>
    );
}
