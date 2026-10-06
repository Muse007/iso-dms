import { DonutChart, type DonutSlice } from '@/components/donut-chart';
import { ramp } from '@/lib/color';
import { MobileDashboard } from '@/components/mobile-dashboard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    AlertOctagon,
    ArrowRight,
    ArrowUpRight,
    Building2,
    CalendarClock,
    ChevronRight,
    ClipboardCheck,
    ClockAlert,
    FileClock,
    Maximize2,
    Minimize2,
    Minus,
    RefreshCw,
    SearchCheck,
    ShieldCheck,
    TrendingDown,
    TrendingUp,
    TriangleAlert,
} from 'lucide-react';
import { ReactNode, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

// ───────────────────────────── tipe data ─────────────────────────────

interface Kpi {
    compliance_score: number;
    compliance_closed: number;
    compliance_total: number;
    compliance_target: number;
    findings_open: number;
    findings_overdue: number;
    findings_waiting: number;
    findings_total: number;
    ncr_open: number;
    ncr_overdue: number;
    documents_pending: number;
    documents_review_due: number;
    documents_pending_age: number | null;
    risks_critical: number;
    audits_in_progress: number;
    my_approvals: number;
    spark_compliance: (number | null)[];
    spark_findings: number[];
    spark_ncr: number[];
    spark_documents: number[];
}

interface DashboardProps {
    kpi: Kpi;
    findingFunnel: {
        stages: Array<{ label: string; count: number }>;
        categories: Array<{ label: string; count: number }>;
    };
    findingTrend: Array<{ month: string; opened: number; closed: number }>;
    findingsByDept: Array<{ id: number | null; name: string; pfi: number; minor: number; major: number; total: number }>;
    overdueFindings: Array<{
        id: number;
        audit_id: number;
        reference: string;
        category: string;
        description: string;
        owner: string | null;
        department: string | null;
        due_date: string | null;
        days_overdue: number;
    }>;
    upcomingAudits: Array<{
        id: number;
        code: string;
        title: string;
        department: string | null;
        lead_auditor: string | null;
        planned_date: string | null;
        days_away: number | null;
    }>;
    auditStatus: Array<{ key: string; label: string; count: number }>;
    approvalStats: { approved: number; pending: number; rejected: number; revision: number };
    heatmap: Record<number, Record<number, number>>;
    departmentPerf: Array<{ name: string; score: number; records: number }>;
    recentActivity: Array<{ id: number; event: string; log_name: string; subject: string; causer: string; time_ago: string }>;
    /** department null = user berhak melihat data lintas departemen. */
    scope: { department: string | null; generated_at: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

const RED = '#b91c1c';
const ORANGE = '#f97316';
const AMBER = '#f59e0b';
const EMERALD = '#10b981';
const BLUE = '#2563eb';
const ZINC = '#71717a';

const categoryTone: Record<string, string> = { PFI: EMERALD, Minor: AMBER, Major: RED };

/**
 * Tahap alur temuan memakai satu ramp biru yang makin pekat seiring temuan
 * bergerak maju, sehingga warnanya sendiri menyiratkan kemajuan. "Closed"
 * sengaja keluar dari ramp (hijau) karena ia bukan tahap lanjutan, melainkan
 * garis akhir.
 */
const STAGE_ORDER = ['Open', 'Revisi', 'Approval Atasan', 'Verifikasi Auditor', 'Verifikasi Lead'];
const STAGE_RAMP = ramp('#bfdbfe', '#1e40af', STAGE_ORDER.length);
const stageTone: Record<string, string> = {
    ...Object.fromEntries(STAGE_ORDER.map((label, i) => [label, STAGE_RAMP[i]])),
    Closed: EMERALD,
};

/** Pola yang sama untuk status jadwal audit: ramp menuju pelaksanaan, hijau saat selesai. */
const STATUS_RAMP = ramp('#dbeafe', '#1d4ed8', 4);
const auditStatusTone: Record<string, string> = {
    planned: STATUS_RAMP[0],
    scheduled: STATUS_RAMP[1],
    in_progress: STATUS_RAMP[2],
    reporting: STATUS_RAMP[3],
    closed: EMERALD,
};

/**
 * Departemen tidak punya urutan bawaan, tetapi datanya sudah terurut dari
 * temuan terbanyak — ramp gelap→terang membuat urutan itu ikut terbaca dari
 * warnanya, bukan sekadar kumpulan warna acak.
 */
const deptPalette = (count: number) => ramp('#1e3a8a', '#7dd3fc', Math.max(count, 1));

/** Departemen yang tampil utuh sebelum sisanya digabung jadi satu slice. */
const DEPT_VISIBLE = 7;
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

/** Warna capaian KPI mengikuti nilainya, bukan urutan baris — supaya warna ikut bermakna. */
function scoreTone(score: number) {
    if (score >= 85) return EMERALD;
    if (score >= 70) return AMBER;
    return RED;
}

function riskColor(severity: number, likelihood: number) {
    const s = severity * likelihood;
    if (s >= 15) return RED;
    if (s >= 10) return ORANGE;
    if (s >= 5) return AMBER;
    return EMERALD;
}

const riskLevelLabel = (severity: number, likelihood: number) => {
    const s = severity * likelihood;
    if (s >= 15) return 'Critical';
    if (s >= 10) return 'High';
    if (s >= 5) return 'Medium';
    return 'Low';
};

/**
 * Tren dari deret sparkline: membandingkan titik pertama yang ada datanya
 * dengan titik terakhir. Nilai null (bulan tanpa data) diabaikan.
 */
function kpiDelta(series: (number | null)[], higherIsBetter: boolean) {
    const points = (series ?? []).filter((v): v is number => v !== null && v !== undefined);
    if (points.length < 2) return undefined;

    const first = points[0];
    const last = points[points.length - 1];
    const diff = last - first;
    if (diff === 0) return { value: 'stabil', tone: 'neutral' as const };

    const pct = first === 0 ? 100 : (diff / Math.abs(first)) * 100;
    const good = higherIsBetter ? diff > 0 : diff < 0;
    const sign = diff > 0 ? '+' : '−';
    const value =
        Math.abs(pct) >= 1 ? `${sign}${Math.abs(pct).toFixed(0)}%` : `${sign}${Math.abs(diff).toFixed(0)}`;

    return { value, tone: (good ? 'good' : 'bad') as 'good' | 'bad', rising: diff > 0 };
}

const monthLabel = (offsetFromEnd: number) =>
    new Date(new Date().setMonth(new Date().getMonth() - (11 - offsetFromEnd))).toLocaleString('id-ID', {
        month: 'short',
        year: '2-digit',
    });

// ───────────────────────────── elemen pakai-ulang ─────────────────────────────

/**
 * Tooltip chart yang seragam & sadar tema gelap — pengganti tooltip bawaan Recharts.
 * Tipe payload sengaja longgar (`unknown`) agar cocok dengan bentuk yang dikirim
 * Recharts untuk semua jenis chart tanpa perlu cast di setiap pemakaian.
 */
interface TipProps {
    active?: boolean;
    payload?: readonly { name?: unknown; value?: unknown; color?: string; dataKey?: unknown }[];
    label?: unknown;
    suffix?: string;
}

function ChartTip({ active, payload, label, suffix = '' }: TipProps) {
    if (!active || !payload?.length) return null;
    const heading = label === undefined || label === null || label === '' ? null : String(label);

    return (
        <div className="pointer-events-none rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
            {heading && <div className="mb-1 font-semibold text-foreground">{heading}</div>}
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2 whitespace-nowrap">
                    <span className="size-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-muted-foreground">{String(p.name ?? p.dataKey ?? '')}</span>
                    <span className="ml-auto font-mono font-semibold tabular-nums text-foreground">
                        {String(p.value ?? '—')}
                        {suffix}
                    </span>
                </div>
            ))}
        </div>
    );
}

/** Kerangka kartu dengan judul konsisten + reaksi hover yang seragam. */
function Panel({
    eyebrow,
    title,
    action,
    className,
    children,
}: {
    eyebrow: string;
    title: string;
    action?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    return (
        <Card
            className={cn(
                'group/panel overflow-hidden border-zinc-200/80 shadow-sm transition-shadow duration-200',
                'hover:shadow-md dark:border-zinc-800',
                className,
            )}
        >
            <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {eyebrow}
                        </div>
                        <div className="truncate text-base font-bold tracking-tight">{title}</div>
                    </div>
                    {action}
                </div>
                {children}
            </CardContent>
        </Card>
    );
}

function PanelLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <Link
            href={href}
            prefetch
            className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground',
                'transition-colors hover:bg-muted hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c]/40',
            )}
        >
            {children}
            <ChevronRight className="size-3.5 transition-transform duration-200 group-hover/panel:translate-x-0.5" />
        </Link>
    );
}

function Sparkline({ data, color, id }: { data: (number | null)[]; color: string; id: string }) {
    const points = data.map((y, x) => ({ x, y }));
    return (
        <ResponsiveContainer width="100%" height={44}>
            <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey="y"
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#spark-${id})`}
                    // Bulan tanpa data ditinggalkan sebagai celah, bukan disambung
                    // garis lurus yang menyiratkan pengukuran yang tak pernah ada.
                    connectNulls={false}
                    dot={false}
                    activeDot={{ r: 3.5, fill: color, strokeWidth: 0 }}
                />
                <Tooltip
                    cursor={{ stroke: color, strokeOpacity: 0.3, strokeWidth: 1 }}
                    content={(props) => (
                        <ChartTip
                            {...props}
                            payload={props.payload?.map((p) => ({ ...p, name: 'Nilai', color }))}
                            label={monthLabel(Number(props.label ?? 0))}
                        />
                    )}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

/** Kartu KPI: seluruhnya bisa diklik menuju modul terkait, dengan umpan balik hover. */
function KpiCard({
    id,
    label,
    value,
    suffix,
    icon: Icon,
    color,
    delta,
    sub,
    spark,
    href,
}: {
    id: string;
    label: string;
    value: number | string;
    suffix?: string;
    icon: typeof ShieldCheck;
    color: string;
    delta?: { value: string; tone: 'good' | 'bad' | 'neutral'; rising?: boolean };
    sub?: ReactNode;
    /** Kosongkan bila metrik ini tidak punya deret 12 bulan yang bisa dipertanggungjawabkan. */
    spark?: (number | null)[];
    href: string;
}) {
    const hasSeries = (spark ?? []).some((v) => v !== null && v !== undefined);
    const deltaTone =
        delta?.tone === 'good'
            ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400'
            : delta?.tone === 'bad'
              ? 'bg-red-500/12 text-red-700 dark:text-red-400'
              : 'bg-zinc-500/12 text-zinc-600 dark:text-zinc-400';

    return (
        <Link
            href={href}
            prefetch
            className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
            <Card
                className={cn(
                    'relative h-full overflow-hidden border-zinc-200/80 shadow-sm dark:border-zinc-800',
                    'transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg',
                )}
            >
                {/* Garis aksen atas menebal saat hover — penanda kartu ini interaktif. */}
                <span
                    className="absolute inset-x-0 top-0 h-0.5 transition-all duration-200 group-hover:h-1"
                    style={{ background: `linear-gradient(90deg, ${color}, ${color}00)` }}
                />
                <CardContent className="relative p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                        <div
                            className="flex size-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                            style={{ background: `${color}1f`, color }}
                        >
                            <Icon className="size-[18px]" />
                        </div>
                        {delta && (
                            <Badge variant="secondary" className={cn('gap-1 border-0 font-semibold', deltaTone)}>
                                {delta.tone === 'neutral' ? (
                                    <Minus className="size-3" />
                                ) : delta.rising ? (
                                    <TrendingUp className="size-3" />
                                ) : (
                                    <TrendingDown className="size-3" />
                                )}
                                {delta.value}
                            </Badge>
                        )}
                    </div>

                    <div className="mt-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-1">
                        <span className="font-mono text-3xl font-extrabold tracking-tight tabular-nums">{value}</span>
                        {suffix && <span className="text-lg text-muted-foreground">{suffix}</span>}
                    </div>

                    {hasSeries && (
                        <div className="-mx-1 mt-2 h-11">
                            <Sparkline data={spark ?? []} color={color} id={id} />
                        </div>
                    )}

                    <div className={cn('flex items-center justify-between gap-2', hasSeries ? 'mt-1' : 'mt-4')}>
                        <div className="min-w-0 text-[11px] leading-tight text-muted-foreground">{sub}</div>
                        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

/** Chip antrian kerja: angka nol tetap ditampilkan (redup) karena "kosong" juga informasi. */
function ActionChip({
    label,
    count,
    icon: Icon,
    color,
    href,
    hint,
}: {
    label: string;
    count: number;
    icon: typeof ShieldCheck;
    color: string;
    href: string;
    /** Penjelasan tambahan yang muncul saat kursor menetap di chip. */
    hint?: string;
}) {
    const empty = count === 0;
    return (
        <Link
            href={href}
            prefetch
            title={hint ?? `${count} ${label.toLowerCase()}`}
            className={cn(
                'group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c]/40',
                empty
                    ? 'border-zinc-200/80 bg-muted/30 hover:bg-muted/60 dark:border-zinc-800'
                    : 'border-zinc-200/80 bg-background hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800',
            )}
            style={empty ? undefined : { borderColor: `${color}40` }}
        >
            <span
                className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110"
                style={{ background: empty ? undefined : `${color}1f`, color: empty ? undefined : color }}
            >
                <Icon className={cn('size-4', empty && 'text-muted-foreground')} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block font-mono text-lg font-bold leading-none tabular-nums">
                    <span className={cn(empty && 'text-muted-foreground')}>{count}</span>
                </span>
                <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">{label}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
    );
}

function EmptyState({ children }: { children: ReactNode }) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{children}</div>;
}

// ───────────────────────────── halaman ─────────────────────────────

export default function Dashboard({
    kpi,
    findingFunnel,
    findingTrend,
    findingsByDept,
    overdueFindings,
    upcomingAudits,
    auditStatus,
    approvalStats,
    heatmap,
    departmentPerf,
    recentActivity,
    scope,
}: DashboardProps) {
    const [deptExpanded, setDeptExpanded] = useState(false);

    // ── Slice donut ────────────────────────────────────────────────────────
    // Slice yang punya `href` berpindah ke daftar terfilter saat diklik; sisanya
    // hanya menyorot dirinya sendiri (angka di tengah donut ikut berubah), karena
    // belum ada halaman daftar temuan yang bisa difilter per kategori/tahap.

    const categorySlices: DonutSlice[] = findingFunnel.categories.map((c) => ({
        key: c.label,
        label: c.label,
        value: c.count,
        color: categoryTone[c.label] ?? ZINC,
        hint: `${c.count} temuan berkategori ${c.label}`,
    }));

    const stageSlices: DonutSlice[] = findingFunnel.stages.map((s) => ({
        key: s.label,
        label: s.label,
        value: s.count,
        color: stageTone[s.label] ?? ZINC,
        hint: `${s.count} temuan pada tahap ${s.label}`,
    }));

    // Daftar departemen bisa panjang. Secara bawaan hanya beberapa teratas yang
    // tampil utuh dan sisanya digabung; gabungan itu bisa dipecah kembali tanpa
    // request baru karena server sudah mengirim seluruh departemen.
    const deptRows =
        deptExpanded || findingsByDept.length <= DEPT_VISIBLE + 1
            ? findingsByDept
            : [
                  ...findingsByDept.slice(0, DEPT_VISIBLE),
                  {
                      id: null,
                      name: `${findingsByDept.length - DEPT_VISIBLE} departemen lainnya`,
                      pfi: findingsByDept.slice(DEPT_VISIBLE).reduce((s, d) => s + d.pfi, 0),
                      minor: findingsByDept.slice(DEPT_VISIBLE).reduce((s, d) => s + d.minor, 0),
                      major: findingsByDept.slice(DEPT_VISIBLE).reduce((s, d) => s + d.major, 0),
                      total: findingsByDept.slice(DEPT_VISIBLE).reduce((s, d) => s + d.total, 0),
                  },
              ];

    const deptColors = deptPalette(deptRows.length);
    const deptSlices: DonutSlice[] = deptRows.map((d, i) => ({
        key: d.name,
        label: d.name,
        value: d.total,
        color: deptColors[i],
        href: d.id ? `/audits?department=${d.id}` : undefined,
        // Slice gabungan tidak menuju ke mana-mana — kliknya memecah isinya.
        onSelect: d.id === null && !deptExpanded ? () => setDeptExpanded(true) : undefined,
        hint:
            d.id === null
                ? `${d.total} temuan dari ${findingsByDept.length - DEPT_VISIBLE} departemen — klik untuk memecah`
                : `${d.name}: ${d.pfi} PFI · ${d.minor} Minor · ${d.major} Major — klik untuk memfilter daftar audit`,
    }));

    const auditStatusSlices: DonutSlice[] = auditStatus.map((s) => ({
        key: s.key,
        label: s.label,
        value: s.count,
        color: auditStatusTone[s.key] ?? ZINC,
        href: `/audits?status=${s.key}`,
        hint: `${s.count} audit berstatus ${s.label} — klik untuk memfilter daftar audit`,
    }));

    const approvalSlices: DonutSlice[] = [
        { key: 'approved', label: 'Disetujui', value: approvalStats.approved, color: EMERALD },
        { key: 'pending', label: 'Menunggu', value: approvalStats.pending, color: ORANGE, href: '/approvals' },
        { key: 'rejected', label: 'Ditolak', value: approvalStats.rejected, color: RED },
        { key: 'revision', label: 'Revisi', value: approvalStats.revision, color: ZINC },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            {/* Tampilan mobile: ringkas, tanpa chart berat. Data identik dengan
                desktop — tidak ada request tambahan. Pemilihan lewat CSS agar
                tidak ada kedipan saat hydrate. */}
            <div className="md:hidden">
                <MobileDashboard
                    kpi={kpi}
                    overdueFindings={overdueFindings}
                    departmentPerf={departmentPerf}
                    recentActivity={recentActivity}
                />
            </div>

            <div className="hidden flex-1 flex-col gap-5 p-4 md:flex md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#b91c1c] dark:text-[#fca5a5]">
                            <span className="size-1.5 animate-pulse rounded-full bg-[#dc2626]" />
                            Audit Mutu Internal · ISO 9001
                        </div>
                        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Dashboard</h1>
                        <p className="text-sm text-muted-foreground">
                            Ringkasan temuan audit, tindak lanjut, dan kepatuhan sistem mutu.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {scope.department && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300">
                                <Building2 className="size-3" />
                                Data departemen {scope.department}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] text-muted-foreground dark:border-zinc-800">
                            <RefreshCw className="size-3" />
                            Diperbarui {scope.generated_at}
                        </span>
                    </div>
                </div>

                {/* KPI — urutan mengikuti bobot data: temuan audit lebih dulu */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <KpiCard
                        id="findings"
                        label="Temuan Audit Terbuka"
                        value={kpi.findings_open}
                        icon={SearchCheck}
                        color={RED}
                        delta={kpiDelta(kpi.spark_findings, false)}
                        spark={kpi.spark_findings}
                        href="/audits"
                        sub={
                            <>
                                {kpi.findings_overdue} overdue · {kpi.findings_waiting} menunggu verifikasi
                            </>
                        }
                    />
                    <KpiCard
                        id="compliance"
                        label="Skor Kepatuhan"
                        value={kpi.compliance_score.toFixed(1)}
                        suffix="%"
                        icon={ShieldCheck}
                        color={kpi.compliance_score >= kpi.compliance_target ? EMERALD : AMBER}
                        delta={kpiDelta(kpi.spark_compliance, true)}
                        spark={kpi.spark_compliance}
                        href="/audits"
                        sub={
                            <>
                                {kpi.compliance_closed} dari {kpi.compliance_total} ketidaksesuaian ditutup · target{' '}
                                {kpi.compliance_target}%
                            </>
                        }
                    />
                    <KpiCard
                        id="audits"
                        label="Audit Berjalan"
                        value={kpi.audits_in_progress}
                        icon={ClipboardCheck}
                        color={ORANGE}
                        href="/audits"
                        sub={
                            upcomingAudits.length > 0
                                ? `${upcomingAudits.length} audit dalam 30 hari ke depan`
                                : 'Tidak ada audit terjadwal 30 hari ke depan'
                        }
                    />
                    <KpiCard
                        id="ncr"
                        label="NCR / CAR / CAPA Terbuka"
                        value={kpi.ncr_open}
                        icon={AlertOctagon}
                        color={BLUE}
                        delta={kpiDelta(kpi.spark_ncr, false)}
                        spark={kpi.spark_ncr}
                        href="/ncr"
                        sub={kpi.ncr_overdue > 0 ? `${kpi.ncr_overdue} lewat jatuh tempo` : 'Semua dalam jadwal'}
                    />
                </div>

                {/* Antrian kerja */}
                <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Perlu Tindakan
                    </div>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                        <ActionChip
                            label="Temuan overdue"
                            count={kpi.findings_overdue}
                            icon={ClockAlert}
                            color={RED}
                            href="/audits"
                            hint={`${kpi.findings_overdue} temuan audit sudah melewati due date dari total ${kpi.findings_total} temuan`}
                        />
                        <ActionChip
                            label="Menunggu verifikasi"
                            count={kpi.findings_waiting}
                            icon={SearchCheck}
                            color={ORANGE}
                            href="/audits"
                            hint="Temuan yang sudah ditindaklanjuti auditee dan menunggu approval atasan / verifikasi auditor / verifikasi lead auditor"
                        />
                        <ActionChip
                            label="Approval untuk Anda"
                            count={kpi.my_approvals}
                            icon={ClipboardCheck}
                            color={BLUE}
                            href="/approvals"
                            hint="Dokumen & item yang menunggu keputusan Anda sendiri"
                        />
                        <ActionChip
                            label="Dokumen direview"
                            count={kpi.documents_pending}
                            icon={FileClock}
                            color={AMBER}
                            href="/documents?status=in_review"
                            hint={
                                kpi.documents_pending_age !== null
                                    ? `Rata-rata sudah menunggu ${kpi.documents_pending_age} hari sejak perubahan terakhir`
                                    : 'Tidak ada dokumen yang sedang direview'
                            }
                        />
                        <ActionChip
                            label="Review dokumen ≤30 hari"
                            count={kpi.documents_review_due}
                            icon={CalendarClock}
                            color={ZINC}
                            href="/documents"
                            hint="Dokumen terbit/disetujui yang tanggal tinjauan berikutnya jatuh dalam 30 hari"
                        />
                        <ActionChip
                            label="Risiko kritis"
                            count={kpi.risks_critical}
                            icon={TriangleAlert}
                            color={RED}
                            href="/risks"
                            hint="Risiko dengan level critical pada risk register"
                        />
                    </div>
                </div>

                {/* Alur temuan + tren */}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <Panel
                        eyebrow="Audit Internal"
                        title="Kategori Temuan"
                        action={<PanelLink href="/audits">Lihat</PanelLink>}
                    >
                        <DonutChart
                            slices={categorySlices}
                            centerCaption="total temuan"
                            emptyLabel="Belum ada temuan audit."
                        />
                    </Panel>

                    <Panel
                        eyebrow="Audit Internal"
                        title="Temuan Dibuat vs Ditutup · 12 bulan"
                        className="xl:col-span-2"
                    >
                        <ResponsiveContainer width="100%" height={280}>
                            <ComposedChart data={findingTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="4 4" stroke="rgba(120,120,130,.18)" vertical={false} />
                                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip cursor={{ fill: 'rgba(120,120,130,.08)' }} content={<ChartTip />} />
                                <Bar dataKey="opened" name="Dibuat" fill={RED} radius={[5, 5, 0, 0]} maxBarSize={26} />
                                <Bar dataKey="closed" name="Ditutup" fill={EMERALD} radius={[5, 5, 0, 0]} maxBarSize={26} />
                                <Line
                                    type="monotone"
                                    dataKey="closed"
                                    name="Tren penutupan"
                                    stroke={EMERALD}
                                    strokeWidth={2}
                                    dot={false}
                                    legendType="none"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                        <div className="mt-1 flex items-center gap-4 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="size-2.5 rounded-sm" style={{ background: RED }} /> Dibuat
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="size-2.5 rounded-sm" style={{ background: EMERALD }} /> Ditutup
                            </span>
                        </div>
                    </Panel>
                </div>

                {/* Daftar kerja: temuan overdue + audit mendatang */}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <Panel
                        eyebrow="Perlu Tindak Lanjut"
                        title="Temuan Lewat Jatuh Tempo"
                        className="xl:col-span-2"
                        action={<PanelLink href="/audits">Semua temuan</PanelLink>}
                    >
                        {overdueFindings.length === 0 ? (
                            <EmptyState>Tidak ada temuan yang lewat jatuh tempo. 👍</EmptyState>
                        ) : (
                            <ul className="-mx-2 divide-y divide-border/70">
                                {overdueFindings.map((f) => (
                                    <li key={f.id}>
                                        <Link
                                            href={`/audits/${f.audit_id}/findings/${f.id}`}
                                            prefetch
                                            className={cn(
                                                'group/item flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors',
                                                'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c]/40',
                                            )}
                                        >
                                            <span
                                                className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                                                style={{
                                                    background: `${findingCategoryTone[f.category] ?? ZINC}1f`,
                                                    color: findingCategoryTone[f.category] ?? ZINC,
                                                }}
                                            >
                                                {findingCategoryLabel[f.category] ?? f.category}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium">{f.description}</span>
                                                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                                    <span className="font-mono">{f.reference}</span>
                                                    {f.department && ` · ${f.department}`}
                                                    {f.owner && ` · PIC ${f.owner}`}
                                                </span>
                                            </span>
                                            <span className="shrink-0 text-right">
                                                <span className="block font-mono text-sm font-bold tabular-nums text-red-700 dark:text-red-400">
                                                    +{f.days_overdue}h
                                                </span>
                                                <span className="block text-[10px] text-muted-foreground">
                                                    due {f.due_date}
                                                </span>
                                            </span>
                                            <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover/item:translate-x-0.5 group-hover/item:opacity-100" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    <Panel
                        eyebrow="Audit Internal"
                        title="Alur Penyelesaian Temuan"
                        action={<PanelLink href="/audits">Lihat</PanelLink>}
                    >
                        <DonutChart
                            slices={stageSlices}
                            centerCaption="total temuan"
                            emptyLabel="Belum ada temuan audit."
                        />
                    </Panel>
                </div>

                {/* Sebaran temuan · status jadwal · agenda terdekat */}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <Panel
                        eyebrow="Audit Internal"
                        title="Temuan per Departemen"
                        className="xl:col-span-2"
                        action={
                            <div className="flex shrink-0 items-center gap-1">
                                {findingsByDept.length > DEPT_VISIBLE + 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setDeptExpanded((v) => !v)}
                                        className={cn(
                                            'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                                            'text-muted-foreground hover:bg-muted hover:text-foreground',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c]/40',
                                        )}
                                    >
                                        {deptExpanded ? (
                                            <>
                                                <Minimize2 className="size-3.5" /> Ringkas
                                            </>
                                        ) : (
                                            <>
                                                <Maximize2 className="size-3.5" /> Pecah semua ({findingsByDept.length})
                                            </>
                                        )}
                                    </button>
                                )}
                                <PanelLink href="/audits">Detail</PanelLink>
                            </div>
                        }
                    >
                        <DonutChart
                            variant="rose"
                            slices={deptSlices}
                            size={230}
                            centerCaption="total temuan"
                            maxLegendHeight={deptExpanded ? 260 : undefined}
                            emptyLabel="Belum ada temuan audit."
                        />
                    </Panel>

                    <Panel eyebrow="Jadwal" title="Audit 30 Hari ke Depan" action={<PanelLink href="/audits">Jadwal</PanelLink>}>
                        {upcomingAudits.length === 0 ? (
                            <EmptyState>Belum ada audit terjadwal dalam 30 hari.</EmptyState>
                        ) : (
                            <ul className="-mx-2 divide-y divide-border/70">
                                {upcomingAudits.map((a) => (
                                    <li key={a.id}>
                                        <Link
                                            href={`/audits/${a.id}`}
                                            prefetch
                                            className="group/item flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c]/40"
                                        >
                                            <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-muted/60 transition-colors group-hover/item:bg-[#b91c1c]/10">
                                                <span className="font-mono text-sm font-bold leading-none tabular-nums">
                                                    {a.days_away === 0 ? 'H' : a.days_away}
                                                </span>
                                                <span className="text-[9px] uppercase text-muted-foreground">
                                                    {a.days_away === 0 ? 'ini' : 'hari'}
                                                </span>
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium">{a.title}</span>
                                                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                                    <span className="font-mono">{a.code}</span> · {a.planned_date}
                                                    {a.lead_auditor && ` · ${a.lead_auditor}`}
                                                </span>
                                            </span>
                                            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover/item:translate-x-0.5" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>

                {/* Pendukung: KPI departemen + aktivitas */}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <Panel eyebrow="Kinerja" title="Capaian KPI Departemen" className="xl:col-span-2">
                        {departmentPerf.length === 0 ? (
                            <EmptyState>Belum ada catatan KPI yang bisa dirata-ratakan.</EmptyState>
                        ) : (
                            <ResponsiveContainer width="100%" height={Math.max(200, departmentPerf.length * 34)}>
                                <BarChart
                                    data={departmentPerf}
                                    layout="vertical"
                                    margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(120,120,130,.18)" horizontal={false} />
                                    <XAxis type="number" domain={[0, 100]} fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        fontSize={11}
                                        width={110}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(120,120,130,.08)' }}
                                        content={(props) => <ChartTip {...props} suffix="%" />}
                                    />
                                    <Bar dataKey="score" name="Capaian" radius={[0, 6, 6, 0]} maxBarSize={20}>
                                        {departmentPerf.map((d) => (
                                            <Cell key={d.name} fill={scoreTone(d.score)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Panel>

                    <Panel
                        eyebrow="Jadwal Audit"
                        title="Status Pelaksanaan"
                        action={<PanelLink href="/audits">Daftar</PanelLink>}
                    >
                        <DonutChart
                            slices={auditStatusSlices}
                            centerCaption="total audit"
                            emptyLabel="Belum ada jadwal audit."
                        />
                    </Panel>
                </div>

                {/* Pendukung: aktivitas · risiko · persetujuan */}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <Panel eyebrow="Jejak Audit" title="Aktivitas Terkini">
                        {recentActivity.length === 0 ? (
                            <EmptyState>Belum ada aktivitas.</EmptyState>
                        ) : (
                            <ul className="-mx-2 space-y-0.5">
                                {recentActivity.map((a) => (
                                    <li
                                        key={a.id}
                                        className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                                    >
                                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#dc2626]" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm">
                                                <span className="font-semibold">{a.causer}</span> {a.event}{' '}
                                                <span className="font-mono text-xs">{a.subject}</span>
                                            </span>
                                            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                                {a.log_name} · {a.time_ago}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    <Panel
                        eyebrow="Manajemen Risiko"
                        title="Matriks Dampak × Kemungkinan"
                        action={<PanelLink href="/risks">Risk register</PanelLink>}
                    >
                        <div className="flex gap-3">
                            <div className="flex flex-col justify-between py-1 text-[10px] font-semibold text-muted-foreground">
                                <span>Dampak 5</span>
                                {[4, 3, 2].map((n) => (
                                    <span key={n} className="text-center">{n}</span>
                                ))}
                                <span className="text-center">1</span>
                            </div>
                            <div className="flex-1">
                                <div className="grid grid-cols-5 gap-1.5">
                                    {[5, 4, 3, 2, 1].flatMap((sev) =>
                                        [1, 2, 3, 4, 5].map((lik) => {
                                            const count = heatmap?.[sev]?.[lik] ?? 0;
                                            return (
                                                <div
                                                    key={`${sev}-${lik}`}
                                                    title={`${riskLevelLabel(sev, lik)} — dampak ${sev} × kemungkinan ${lik}: ${count} risiko`}
                                                    className={cn(
                                                        'flex aspect-square cursor-default items-center justify-center rounded-md text-[11px] font-bold text-white shadow-sm',
                                                        'transition-all duration-200 hover:z-10 hover:scale-110 hover:shadow-md hover:ring-2 hover:ring-foreground/30',
                                                    )}
                                                    style={{
                                                        background: riskColor(sev, lik),
                                                        opacity: count === 0 ? 0.3 : 1,
                                                    }}
                                                >
                                                    {count > 0 ? count : ''}
                                                </div>
                                            );
                                        }),
                                    )}
                                </div>
                                <div className="mt-1.5 grid grid-cols-5 text-center text-[10px] font-semibold text-muted-foreground">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <span key={n}>{n}</span>
                                    ))}
                                </div>
                                <div className="mt-0.5 text-center text-[10px] text-muted-foreground">Kemungkinan →</div>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-[11px] text-muted-foreground">
                            {(
                                [
                                    ['Low', EMERALD],
                                    ['Medium', AMBER],
                                    ['High', ORANGE],
                                    ['Critical', RED],
                                ] as const
                            ).map(([label, color]) => (
                                <span key={label} className="inline-flex items-center gap-1.5">
                                    <span className="size-2.5 rounded-sm" style={{ background: color }} /> {label}
                                </span>
                            ))}
                        </div>
                    </Panel>

                    <Panel
                        eyebrow="Persetujuan"
                        title="Kuartal Berjalan"
                        action={<PanelLink href="/approvals">Antrian</PanelLink>}
                    >
                        <DonutChart
                            slices={approvalSlices}
                            centerCaption="keputusan"
                            emptyLabel="Belum ada aktivitas persetujuan kuartal ini."
                        />
                    </Panel>
                </div>
            </div>
        </AppLayout>
    );
}
