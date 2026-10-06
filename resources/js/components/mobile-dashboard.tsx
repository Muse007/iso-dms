import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import {
    AlertOctagon,
    ArrowRight,
    ChevronRight,
    ClipboardCheck,
    ClockAlert,
    FileClock,
    SearchCheck,
    TriangleAlert,
} from 'lucide-react';

const RED = '#b91c1c';
const ORANGE = '#f97316';
const EMERALD = '#10b981';
const AMBER = '#f59e0b';
const BLUE = '#2563eb';

export interface MobileDashboardProps {
    kpi: {
        compliance_score: number;
        compliance_closed: number;
        compliance_total: number;
        compliance_target: number;
        findings_open: number;
        findings_overdue: number;
        findings_waiting: number;
        ncr_open: number;
        documents_pending: number;
        risks_critical: number;
        audits_in_progress: number;
        my_approvals: number;
    };
    overdueFindings: Array<{
        id: number;
        audit_id: number;
        reference: string;
        category: string;
        description: string;
        owner: string | null;
        due_date: string | null;
        days_overdue: number;
    }>;
    departmentPerf: Array<{ name: string; score: number }>;
    recentActivity: Array<{
        id: number;
        event: string;
        log_name: string;
        subject: string;
        causer: string;
        time_ago: string;
    }>;
}

const findingCategoryTone: Record<string, string> = {
    opportunity: EMERALD,
    minor_nc: AMBER,
    major_nc: RED,
};
const findingCategoryLabel: Record<string, string> = {
    opportunity: 'PFI',
    minor_nc: 'Minor',
    major_nc: 'Major',
};

function greeting(hour: number) {
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 19) return 'Selamat sore';
    return 'Selamat malam';
}

function initials(name: string) {
    return name
        .split(' ')
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function StatTile({
    label,
    value,
    sub,
    icon: Icon,
    color,
    href,
}: {
    label: string;
    value: string | number;
    sub?: string;
    icon: typeof SearchCheck;
    color: string;
    href: string;
}) {
    return (
        <Link href={href} prefetch className="block">
            <Card className="h-full border-zinc-200/70 shadow-sm transition-transform active:scale-[0.98] dark:border-zinc-800">
                <CardContent className="p-3.5">
                    <div
                        className="flex size-9 items-center justify-center rounded-xl"
                        style={{ background: `${color}26`, color }}
                    >
                        <Icon className="size-[18px]" />
                    </div>
                    <div className="mt-2.5 font-mono text-2xl font-extrabold leading-none tabular-nums">{value}</div>
                    <div className="mt-1 text-[11px] font-medium leading-tight text-muted-foreground">{label}</div>
                    {sub && <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground/80">{sub}</div>}
                </CardContent>
            </Card>
        </Link>
    );
}

/**
 * Dashboard versi mobile.
 *
 * Menerima data yang sama persis dengan dashboard desktop — tidak ada
 * endpoint atau query tambahan, sehingga tidak ada beban server baru.
 * Chart Recharts sengaja tidak dipakai di sini: pada layar sempit ia sulit
 * dibaca dan berat. Urutannya mengikuti desktop — temuan audit lebih dulu.
 */
export function MobileDashboard({ kpi, overdueFindings, departmentPerf, recentActivity }: MobileDashboardProps) {
    const page = usePage<{ auth?: { user?: { name?: string } } }>();
    const name = page.props.auth?.user?.name ?? 'Pengguna';
    const score = Number(kpi.compliance_score) || 0;

    return (
        <div className="flex flex-col gap-5 p-4">
            {/* Sapaan */}
            <div className="flex items-center gap-3">
                <div className="flex size-11 flex-none items-center justify-center rounded-full bg-[#b91c1c]/10 text-sm font-bold text-[#b91c1c] dark:text-[#fca5a5]">
                    {initials(name)}
                </div>
                <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">{greeting(new Date().getHours())},</div>
                    <div className="truncate font-semibold leading-tight">{name}</div>
                </div>
            </div>

            {/* Temuan audit — angka utama */}
            <Link href="/audits" prefetch className="block">
                <Card className="overflow-hidden border-zinc-200/70 shadow-sm transition-transform active:scale-[0.99] dark:border-zinc-800">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Temuan Audit Terbuka
                            </div>
                            <ChevronRight className="size-4 text-muted-foreground" />
                        </div>

                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="font-mono text-4xl font-extrabold leading-none tabular-nums">
                                {kpi.findings_open}
                            </span>
                            {kpi.findings_overdue > 0 && (
                                <span className="rounded-full bg-red-500/12 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:text-red-400">
                                    {kpi.findings_overdue} overdue
                                </span>
                            )}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                            {kpi.findings_waiting} menunggu verifikasi · {kpi.audits_in_progress} audit berjalan
                        </div>

                        {/* Skor kepatuhan sebagai konteks, bukan angka utama */}
                        <div className="mt-3.5 border-t pt-3">
                            <div className="flex items-baseline justify-between text-[11px]">
                                <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                                    Skor Kepatuhan
                                </span>
                                <span className="font-mono font-bold tabular-nums">{score.toFixed(1)}%</span>
                            </div>
                            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                <div
                                    className="h-full rounded-full transition-[width] duration-700"
                                    style={{
                                        width: `${Math.min(Math.max(score, 0), 100)}%`,
                                        background: score >= kpi.compliance_target ? EMERALD : score >= 70 ? AMBER : RED,
                                    }}
                                />
                            </div>
                            <div className="mt-1 text-[10px] text-muted-foreground">
                                {kpi.compliance_closed} dari {kpi.compliance_total} ketidaksesuaian ditutup · target{' '}
                                {kpi.compliance_target}%
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Link>

            {/* Temuan lewat jatuh tempo — daftar kerja */}
            {overdueFindings.length > 0 && (
                <section>
                    <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Lewat Jatuh Tempo
                    </h2>
                    <Card className="border-zinc-200/70 shadow-sm dark:border-zinc-800">
                        <CardContent className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
                            {overdueFindings.slice(0, 4).map((f) => (
                                <Link
                                    key={f.id}
                                    href={`/audits/${f.audit_id}/findings/${f.id}`}
                                    prefetch
                                    className="flex items-start gap-3 p-3.5 transition-colors active:bg-muted/60"
                                >
                                    <span
                                        className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                                        style={{
                                            background: `${findingCategoryTone[f.category] ?? ORANGE}1f`,
                                            color: findingCategoryTone[f.category] ?? ORANGE,
                                        }}
                                    >
                                        {findingCategoryLabel[f.category] ?? f.category}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-xs font-medium">{f.description}</span>
                                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                            {f.reference}
                                            {f.owner && ` · ${f.owner}`}
                                        </span>
                                    </span>
                                    <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-red-700 dark:text-red-400">
                                        +{f.days_overdue}h
                                    </span>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                </section>
            )}

            {/* KPI ringkas */}
            <div className="grid grid-cols-2 gap-3">
                <StatTile
                    label="Menunggu verifikasi"
                    value={kpi.findings_waiting}
                    icon={SearchCheck}
                    color={ORANGE}
                    href="/audits"
                />
                <StatTile
                    label="Approval untuk Anda"
                    value={kpi.my_approvals}
                    icon={ClipboardCheck}
                    color={BLUE}
                    href="/approvals"
                />
                <StatTile label="NCR / CAPA terbuka" value={kpi.ncr_open} icon={AlertOctagon} color={RED} href="/ncr" />
                <StatTile
                    label="Dokumen direview"
                    value={kpi.documents_pending}
                    icon={FileClock}
                    color={AMBER}
                    href="/documents?status=in_review"
                />
                <StatTile
                    label="Temuan overdue"
                    value={kpi.findings_overdue}
                    icon={ClockAlert}
                    color={RED}
                    href="/audits"
                />
                <StatTile
                    label="Risiko kritis"
                    value={kpi.risks_critical}
                    icon={TriangleAlert}
                    color={RED}
                    href="/risks"
                />
            </div>

            {/* Performa departemen */}
            {departmentPerf.length > 0 && (
                <section>
                    <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Capaian KPI Departemen
                    </h2>
                    <Card className="border-zinc-200/70 shadow-sm dark:border-zinc-800">
                        <CardContent className="space-y-3 p-4">
                            {departmentPerf.slice(0, 5).map((d) => {
                                const v = Math.min(Math.max(Number(d.score) || 0, 0), 100);
                                return (
                                    <div key={d.name}>
                                        <div className="mb-1 flex items-baseline justify-between gap-2">
                                            <span className="truncate text-xs font-medium">{d.name}</span>
                                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                                {v.toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${v}%`,
                                                    background: v >= 85 ? EMERALD : v >= 70 ? AMBER : RED,
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </section>
            )}

            {/* Aktivitas terkini */}
            {recentActivity.length > 0 && (
                <section>
                    <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Aktivitas Terkini
                    </h2>
                    <Card className="border-zinc-200/70 shadow-sm dark:border-zinc-800">
                        <CardContent className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
                            {recentActivity.slice(0, 6).map((a) => (
                                <div key={a.id} className="flex items-start gap-3 p-3.5">
                                    <div className="mt-0.5 flex size-8 flex-none items-center justify-center rounded-lg bg-zinc-100 text-[10px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                        {initials(a.causer || '?')}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-xs font-medium">{a.subject}</div>
                                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                            {a.causer} · {a.event}
                                        </div>
                                    </div>
                                    <span className="flex-none text-[10px] text-muted-foreground">{a.time_ago}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </section>
            )}

            {/* Tautan ke antrian approval */}
            <Link
                href="/approvals"
                prefetch
                className={cn(
                    'flex items-center justify-between rounded-xl border border-zinc-200/70 px-4 py-3.5 text-sm font-medium shadow-sm',
                    'transition-transform active:scale-[0.99] dark:border-zinc-800',
                )}
            >
                <span className="inline-flex items-center gap-2">
                    <ArrowRight className="size-4 text-[#b91c1c] dark:text-[#fca5a5]" />
                    Buka Approval Queue
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
        </div>
    );
}
