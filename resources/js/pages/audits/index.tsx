import { AuditFormDialog } from '@/components/audit-form-dialog';
import { PercentStackedBars } from '@/components/percent-stacked-bars';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import {
    AlertCircle,
    Building2,
    CalendarCheck,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClockAlert,
    FileSpreadsheet,
    Plus,
    Search,
    Trash2,
    UserRound,
    X,
} from 'lucide-react';
import {
    MobileBadge,
    MobileList,
    MobileListCard,
    MobileListEmpty,
    MobileMeta,
    MobilePager,
    mobileDate,
} from '@/components/mobile-list';
import { useState } from 'react';

interface AuditRow {
    id: number;
    code: string;
    title: string;
    standard: string;
    status: string;
    planned_date: string;
    location?: string | null;
    department?: { id: number; name: string } | null;
    // Relasi Eloquent di-serialisasi snake_case (`leadAuditor` → `lead_auditor`).
    lead_auditor?: { id: number; name: string } | null;
    findings_pfi: number;
    findings_minor: number;
    findings_major: number;
    findings_open: number;
    findings_overdue: number;
}

interface Props {
    audits: {
        data: AuditRow[];
        total: number;
        current_page: number;
        last_page: number;
        from: number | null;
        to: number | null;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    kpis: {
        this_month: number;
        overdue: number;
        findings_open: number;
        findings_closed: number;
        awaiting_approval: number;
    };
    matrix: Array<{ id: number | null; name: string; pfi: number; minor: number; major: number; total: number }>;
    filters: { q?: string; standard?: string; status?: string; department?: string | number };
    departments: { id: number; name: string }[];
    users: { id: number; name: string; department_id: number | null }[];
    canDelete?: boolean;
}

/** Segmen tetap untuk chart distribusi temuan — urutan ringan → berat. */
const FINDING_SEGMENTS = [
    { key: 'pfi', label: 'PFI', color: '#10b981' },
    { key: 'minor', label: 'Minor', color: '#f59e0b' },
    { key: 'major', label: 'Major', color: '#b91c1c' },
];

const statusBadge: Record<string, string> = {
    planned:    'bg-slate-100 text-slate-700',
    scheduled:  'bg-blue-100 text-blue-700',
    in_progress:'bg-amber-100 text-amber-700',
    reporting:  'bg-orange-100 text-orange-700',
    closed:     'bg-emerald-100 text-emerald-700',
    cancelled:  'bg-slate-200 text-slate-500',
};

export default function AuditsIndex({ audits, kpis, matrix, filters, departments, users, canDelete }: Props) {
    const { auth } = usePage<SharedData>().props;

    const deleteAudit = (a: AuditRow) => {
        if (!confirm(`Hapus jadwal audit ${a.code}? Semua temuan di dalamnya ikut terhapus dan tidak dapat dikembalikan.`)) return;
        router.delete(`/audits/${a.id}`, { preserveScroll: true });
    };
    const canCreate = (auth.permissions ?? []).includes('audit.create');
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState(filters.q ?? '');

    const applyFilter = (patch: Partial<typeof filters>) =>
        router.get('/audits', { ...filters, ...patch }, { preserveState: true, preserveScroll: true });

    /** URL daftar audit dengan filter saat ini + perubahan tertentu. */
    const buildAuditsUrl = (patch: Partial<typeof filters>) => {
        const params = new URLSearchParams();
        Object.entries({ ...filters, ...patch }).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
        });
        const qs = params.toString();
        return qs ? `/audits?${qs}` : '/audits';
    };

    // Departemen yang sedang dipakai sebagai filter — dipakai untuk menandai baris
    // distribusi yang aktif sekaligus menampilkan tombol hapus filter.
    const activeDept =
        filters.department != null
            ? (departments.find((d) => String(d.id) === String(filters.department)) ?? null)
            : null;

    // Pilihan audit untuk export rekap temuan (FM-BDK-009).
    const [selected, setSelected] = useState<number[]>([]);
    const pageIds = audits.data.map((a) => a.id);
    const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
    const toggleOne = (id: number) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    const togglePage = () =>
        setSelected((prev) => (allOnPageSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]));

    // Tanpa centang → ekspor seluruh audit yang lolos filter saat ini.
    const exportUrl = () => {
        const p = new URLSearchParams();
        if (selected.length) {
            selected.forEach((id) => p.append('ids[]', String(id)));
        } else {
            if (filters.q) p.set('q', filters.q);
            if (filters.standard) p.set('standard', filters.standard);
            if (filters.status) p.set('status', filters.status);
        }
        return `/audits/export/findings?${p.toString()}`;
    };
    const exportLabel = selected.length ? `Export Excel (${selected.length} audit)` : 'Export Excel';

    return (
        <AppLayout breadcrumbs={[{ title: 'Internal Audit', href: '/audits' }]}>
            <Head title="Internal Audit" />
            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight">Internal Audit</h1>
                        <p className="text-sm text-muted-foreground">Plan · Schedule · Execute · Close — ISO 19011</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            asChild={audits.total > 0}
                            variant="outline"
                            disabled={audits.total === 0}
                            title={
                                selected.length
                                    ? `Export rekap temuan dari ${selected.length} audit terpilih`
                                    : 'Export rekap temuan seluruh audit sesuai filter saat ini'
                            }
                            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                        >
                            {audits.total > 0 ? (
                                <a href={exportUrl()}>
                                    <FileSpreadsheet className="size-4" /> {exportLabel}
                                </a>
                            ) : (
                                <span>
                                    <FileSpreadsheet className="size-4" /> {exportLabel}
                                </span>
                            )}
                        </Button>
                        {canCreate && (
                            <Button onClick={() => setOpen(true)} className="bg-[#b91c1c] hover:bg-[#7f1d1d]">
                                <Plus className="size-4" /> Jadwal Baru
                            </Button>
                        )}
                    </div>
                </div>

                {/* KPI tiles */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                    <KpiTile icon={CalendarCheck} label="Audit Bulan Ini" value={kpis.this_month} />
                    <KpiTile icon={ClockAlert}   label="Overdue Findings" value={kpis.overdue} tone="red" />
                    <KpiTile icon={AlertCircle}  label="Findings Open" value={kpis.findings_open} tone="amber" />
                    <KpiTile icon={CheckCircle2} label="Closed (YTD)" value={kpis.findings_closed} tone="emerald" />
                    <KpiTile icon={AlertCircle}  label="Menunggu Approval" value={kpis.awaiting_approval} tone="blue" />
                </div>

                {/* Distribusi temuan per departemen — tiap baris memfilter daftar audit di bawahnya */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Distribusi Temuan per Departemen</CardTitle>
                        {activeDept && (
                            <button
                                onClick={() => applyFilter({ department: undefined })}
                                className="inline-flex items-center gap-1 rounded-md border border-[#b91c1c]/30 px-2 py-1 text-xs font-medium text-[#b91c1c] transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                                <X className="size-3" /> Hapus filter {activeDept.name}
                            </button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <PercentStackedBars
                            segments={FINDING_SEGMENTS}
                            rows={matrix.map((d) => {
                                const selected =
                                    filters.department != null && String(filters.department) === String(d.id);
                                return {
                                    key: d.name,
                                    label: d.name,
                                    values: { pfi: d.pfi, minor: d.minor, major: d.major },
                                    active: selected,
                                    // Klik baris memfilter daftar audit; klik ulang melepas filter.
                                    // Departemen kosong (id null) tidak bisa dijadikan filter.
                                    href:
                                        d.id === null
                                            ? undefined
                                            : selected
                                              ? buildAuditsUrl({ department: undefined })
                                              : buildAuditsUrl({ department: String(d.id) }),
                                };
                            })}
                            unit="temuan"
                            hint="Klik baris untuk memfilter daftar audit"
                            emptyLabel="Belum ada data temuan."
                        />
                    </CardContent>
                </Card>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
                        <Input
                            value={q}
                            placeholder="Cari kode / judul…"
                            className="pl-8"
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilter({ q })}
                        />
                    </div>
                    <select
                        value={filters.standard ?? ''}
                        onChange={(e) => applyFilter({ standard: e.target.value || undefined })}
                        className="rounded border border-input bg-background px-2 text-sm"
                    >
                        <option value="">Semua Standar</option>
                        <option value="iso_9001">ISO 9001</option>
                        <option value="iso_14001">ISO 14001</option>
                        <option value="iso_45001">ISO 45001</option>
                        <option value="iatf">IATF</option>
                        <option value="internal">Internal</option>
                    </select>
                    <select
                        value={filters.status ?? ''}
                        onChange={(e) => applyFilter({ status: e.target.value || undefined })}
                        className="rounded border border-input bg-background px-2 text-sm"
                    >
                        <option value="">Semua Status</option>
                        <option value="planned">Planned</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="in_progress">In Progress</option>
                        <option value="reporting">Reporting</option>
                        <option value="closed">Closed</option>
                    </select>
                    <select
                        value={filters.department ?? ''}
                        onChange={(e) => applyFilter({ department: e.target.value || undefined })}
                        className="rounded border border-input bg-background px-2 text-sm"
                    >
                        <option value="">Semua Departemen</option>
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Daftar versi mobile — data sama, disajikan sebagai kartu */}
                <div className="md:hidden">
                    <MobileList>
                        {audits.data.length === 0 && <MobileListEmpty message="Belum ada audit terjadwal." />}
                        {audits.data.map((a) => {
                            const total = a.findings_pfi + a.findings_minor + a.findings_major;
                            return (
                                <MobileListCard
                                    key={a.id}
                                    href={`/audits/${a.id}`}
                                    code={a.code}
                                    title={a.title}
                                    badges={
                                        <MobileBadge className={statusBadge[a.status] ?? 'bg-slate-100 text-slate-700'}>
                                            {a.status.replace('_', ' ')}
                                        </MobileBadge>
                                    }
                                    meta={
                                        <>
                                            <MobileMeta icon={Building2}>{a.department?.name ?? '—'}</MobileMeta>
                                            <MobileMeta icon={CalendarDays}>{mobileDate(a.planned_date)}</MobileMeta>
                                            <MobileMeta icon={UserRound}>{a.lead_auditor?.name ?? '—'}</MobileMeta>
                                        </>
                                    }
                                    footer={
                                        total + a.findings_overdue > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {a.findings_pfi > 0 && (
                                                    <MobileBadge className="bg-emerald-100 text-emerald-700">
                                                        {a.findings_pfi} PFI
                                                    </MobileBadge>
                                                )}
                                                {a.findings_minor > 0 && (
                                                    <MobileBadge className="bg-amber-100 text-amber-700">
                                                        {a.findings_minor} Minor
                                                    </MobileBadge>
                                                )}
                                                {a.findings_major > 0 && (
                                                    <MobileBadge className="bg-red-100 text-red-700">
                                                        {a.findings_major} Major
                                                    </MobileBadge>
                                                )}
                                                {a.findings_overdue > 0 && (
                                                    <MobileBadge className="bg-red-600 text-white">
                                                        {a.findings_overdue} Overdue
                                                    </MobileBadge>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-[11px] text-muted-foreground">Tanpa temuan</span>
                                        )
                                    }
                                />
                            );
                        })}
                    </MobileList>

                    {/* Pager selalu tampil selama ada data — tombolnya nonaktif bila hanya satu
                        halaman, supaya jumlah data & posisi halaman tetap terbaca user. */}
                    {audits.data.length > 0 && (
                        <MobilePager
                            page={audits.current_page}
                            lastPage={audits.last_page}
                            prevUrl={audits.prev_page_url}
                            nextUrl={audits.next_page_url}
                            summary={`${audits.from ?? 0}–${audits.to ?? 0} dari ${audits.total}`}
                        />
                    )}
                </div>

                {/* Tabel versi desktop */}
                <Card className="hidden md:block">
                    {selected.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-emerald-50 px-4 py-2 text-sm">
                            <span className="font-medium text-emerald-800">
                                {selected.length} audit terpilih — temuannya akan masuk ke rekap FM-BDK-009.
                            </span>
                            <button
                                onClick={() => setSelected([])}
                                className="text-xs font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                            >
                                Bersihkan pilihan
                            </button>
                        </div>
                    )}
                    <CardContent className="overflow-x-auto p-0">
                        <table className="w-full text-sm">
                            <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="w-10 px-3 py-3 text-left font-semibold">
                                        <Checkbox
                                            checked={allOnPageSelected}
                                            onCheckedChange={togglePage}
                                            disabled={pageIds.length === 0}
                                            aria-label="Pilih semua audit di halaman ini"
                                            className="size-4"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold">Kode</th>
                                    <th className="px-4 py-3 text-left font-semibold">Judul / Dept</th>
                                    <th className="px-4 py-3 text-left font-semibold">Standar</th>
                                    <th className="px-4 py-3 text-left font-semibold">Lead</th>
                                    <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
                                    <th className="px-4 py-3 text-left font-semibold">Temuan</th>
                                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                                    {canDelete && <th className="px-4 py-3 text-right font-semibold">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {audits.data.length === 0 && (
                                    <tr>
                                        <td colSpan={canDelete ? 9 : 8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                                            Belum ada audit terjadwal.
                                        </td>
                                    </tr>
                                )}
                                {audits.data.map((a) => (
                                    <tr key={a.id} className={`hover:bg-muted/40 ${selected.includes(a.id) ? 'bg-emerald-50/60' : ''}`}>
                                        <td className="px-3 py-3">
                                            <Checkbox
                                                checked={selected.includes(a.id)}
                                                onCheckedChange={() => toggleOne(a.id)}
                                                aria-label={`Pilih audit ${a.code}`}
                                                className="size-4"
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">
                                            <Link href={`/audits/${a.id}`} className="text-[#b91c1c] hover:underline">{a.code}</Link>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{a.title}</div>
                                            <div className="text-xs text-muted-foreground">{a.department?.name ?? '—'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-xs uppercase">{a.standard.replace('_', ' ')}</td>
                                        <td className="px-4 py-3 text-xs">{a.lead_auditor?.name ?? '—'}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{a.planned_date}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {a.findings_pfi   > 0 && <Badge className="bg-emerald-100 text-emerald-700">{a.findings_pfi} PFI</Badge>}
                                                {a.findings_minor > 0 && <Badge className="bg-amber-100 text-amber-700">{a.findings_minor} Min</Badge>}
                                                {a.findings_major > 0 && <Badge className="bg-red-100 text-red-700">{a.findings_major} Maj</Badge>}
                                                {a.findings_overdue > 0 && <Badge className="bg-red-600 text-white">{a.findings_overdue} OVD</Badge>}
                                                {a.findings_pfi + a.findings_minor + a.findings_major === 0 && (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge className={statusBadge[a.status] ?? 'bg-slate-100 text-slate-700'}>
                                                {a.status.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        {canDelete && (
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => deleteAudit(a)}
                                                    title="Hapus jadwal audit"
                                                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="size-3.5" /> Hapus
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {audits.data.length > 0 && (
                            <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-sm sm:flex-row">
                                <span className="text-muted-foreground">
                                    Menampilkan {audits.from ?? 0}–{audits.to ?? 0} dari {audits.total} audit
                                </span>
                                <div className="flex items-center gap-2">
                                    {audits.prev_page_url ? (
                                        <Link
                                            href={audits.prev_page_url}
                                            preserveScroll
                                            preserveState
                                            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 hover:bg-muted/50"
                                        >
                                            <ChevronLeft className="size-4" /> Sebelumnya
                                        </Link>
                                    ) : (
                                        <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border px-3 py-1.5 text-muted-foreground opacity-50">
                                            <ChevronLeft className="size-4" /> Sebelumnya
                                        </span>
                                    )}
                                    <span className="px-1 text-xs text-muted-foreground">
                                        Hal. {audits.current_page} / {audits.last_page}
                                    </span>
                                    {audits.next_page_url ? (
                                        <Link
                                            href={audits.next_page_url}
                                            preserveScroll
                                            preserveState
                                            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 hover:bg-muted/50"
                                        >
                                            Berikutnya <ChevronRight className="size-4" />
                                        </Link>
                                    ) : (
                                        <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border px-3 py-1.5 text-muted-foreground opacity-50">
                                            Berikutnya <ChevronRight className="size-4" />
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <AuditFormDialog
                open={open}
                onOpenChange={setOpen}
                departments={departments}
                users={users}
            />
        </AppLayout>
    );
}

function KpiTile({
    icon: Icon, label, value, tone,
}: {
    icon: typeof CalendarCheck;
    label: string;
    value: number;
    tone?: 'red' | 'amber' | 'emerald' | 'blue';
}) {
    const toneClass =
        tone === 'red' ? 'text-red-600' :
        tone === 'amber' ? 'text-amber-600' :
        tone === 'emerald' ? 'text-emerald-600' :
        tone === 'blue' ? 'text-blue-600' : '';
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{label}</span>
                    <Icon className="size-4" />
                </div>
                <div className={`mt-2 text-3xl font-bold ${toneClass}`}>{value}</div>
            </CardContent>
        </Card>
    );
}
