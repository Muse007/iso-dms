import { AuditFormDialog } from '@/components/audit-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Calendar, Check, CheckCircle2, FileText, Mail, MessageCircle, Pencil, RefreshCw, ShieldCheck, User, X, XCircle } from 'lucide-react';
import { useState } from 'react';

interface ProcessRow { proses: string; related_documents: string[] | string }
interface ScheduleAudit {
    id: number;
    code: string;
    title: string;
    department?: { name: string } | null;
    department_id: number | null;
    planned_date: string;
    jam_pelaksanaan: string | null;
    location: string | null;
    team: number[] | null;
    auditees: number[] | null;
    processes: ProcessRow[] | null;
}
interface Department { id: number; name: string }
interface UserOpt { id: number; name: string; department_id: number | null }
interface Schedule {
    id: number;
    code: string;
    period_label: string | null;
    standard: string;
    standards: string[] | null;
    type: string;
    status: string;
    scope: string | null;
    objectives: string | null;
    opening_at: string | null;
    closing_at: string | null;
    opening_location: string | null;
    closing_location: string | null;
    audit_categories: string[] | null;
    // Relasi Eloquent di-serialisasi snake_case (`leadAuditor` → `lead_auditor`).
    lead_auditor?: { id: number; name: string } | null;
    mr?: { id: number; name: string } | null;
    mr_signed_at: string | null;
    mr_note: string | null;
    // Relasi `sharedBy` menimpa kolom int `shared_by` saat di-serialisasi.
    shared_by?: { id: number; name: string } | null;
    shared_at: string | null;
    audits: ScheduleAudit[];
}

interface DeliveryRow {
    email: string | null;
    name: string;
    role: string;
    status: string;
    error: string | null;
}

interface Props {
    schedule: Schedule;
    departments: Department[];
    users: UserOpt[];
    deliveryReport?: DeliveryRow[];
    canApproveMr?: boolean;
    canShare?: boolean;
    canEdit?: boolean;
    waReminder?: { role: string; targetName: string | null; url: string | null; reason: string | null } | null;
}

const STD_LABEL: Record<string, string> = {
    iso_9001: 'ISO 9001:2015',
    iso_14001: 'ISO 14001:2015',
    iso_45001: 'ISO 45001:2018',
    iatf: 'IATF 16949',
    internal: 'Internal',
};

const statusBadge: Record<string, string> = {
    pending_review: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    shared: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
};
const statusLabel: Record<string, string> = {
    pending_review: 'Menunggu Review MR',
    approved: 'Disetujui MR',
    shared: 'Sudah Dibagikan',
    rejected: 'Ditolak',
};

export default function ScheduleShow({ schedule, departments, users, deliveryReport, canApproveMr, canShare, canEdit, waReminder }: Props) {
    const standards = (schedule.standards && schedule.standards.length > 0) ? schedule.standards : [schedule.standard];
    const [editOpen, setEditOpen] = useState(false);

    // Normalise related_documents (legacy string or newline-joined) into a string[].
    const toDocs = (rd: string[] | string | null | undefined): string[] => {
        const arr = Array.isArray(rd) ? rd : (rd ? String(rd).split(/\r\n|\r|\n/) : []);
        const clean = arr.map((x) => x.trim()).filter((x) => x !== '');
        return clean.length > 0 ? clean : [''];
    };

    // Map the schedule's audits back into editable bagian rows.
    const editRows = schedule.audits.map((a) => ({
        department_id: a.department_id,
        location: a.location ?? '',
        // planned_date arrives as a full ISO datetime (date cast); <Input type="date"> needs YYYY-MM-DD.
        planned_date: (a.planned_date ?? '').slice(0, 10),
        jam_pelaksanaan: a.jam_pelaksanaan ?? '',
        team: a.team ?? [],
        auditees: a.auditees ?? [],
        processes: (a.processes && a.processes.length > 0)
            ? a.processes.map((p) => ({ proses: p.proses ?? '', related_documents: toDocs(p.related_documents) }))
            : [{ proses: '', related_documents: [''] }],
    }));

    return (
        <AppLayout breadcrumbs={[
            { title: 'Internal Audit', href: '/audits' },
            { title: schedule.code, href: `/audit-schedules/${schedule.id}` },
        ]}>
            <Head title={`Jadwal ${schedule.code}`} />

            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground font-mono">{schedule.code}</div>
                        <h1 className="text-2xl font-extrabold tracking-tight">Schedule Audit Internal</h1>
                        <div className="text-sm text-muted-foreground">{schedule.period_label ?? '—'}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Badge className={statusBadge[schedule.status] ?? ''}>{statusLabel[schedule.status] ?? schedule.status}</Badge>
                            {standards.map((s) => <Badge key={s} variant="outline">{STD_LABEL[s] ?? s}</Badge>)}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {canEdit && (
                            <Button variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
                                <Pencil className="size-4" /> Edit Jadwal
                            </Button>
                        )}
                        {waReminder && waReminder.url && (
                            <Button asChild className="gap-1.5 bg-[#25D366] text-white hover:bg-[#1da851]">
                                <a href={waReminder.url} target="_blank" rel="noreferrer">
                                    <MessageCircle className="size-4" /> Ingatkan {waReminder.role} via WhatsApp
                                </a>
                            </Button>
                        )}
                        {waReminder && !waReminder.url && (
                            <Button
                                variant="outline"
                                disabled
                                className="gap-1.5 opacity-70"
                                title={
                                    waReminder.reason === 'no_phone'
                                        ? `Nomor WhatsApp ${waReminder.targetName ?? 'PIC'} belum diisi di profil pengguna.`
                                        : `Belum ada pengguna ${waReminder.role} dengan nomor WhatsApp.`
                                }
                            >
                                <MessageCircle className="size-4" /> WA {waReminder.role}: {waReminder.reason === 'no_phone' ? 'no. HP kosong' : 'PIC belum ada'}
                            </Button>
                        )}
                        <Button asChild variant="outline" className="gap-1.5">
                            <a href={`/audit-schedules/${schedule.id}/preview-pdf`} target="_blank" rel="noreferrer">
                                <FileText className="size-4" /> Preview PDF (FM-BDK-07)
                            </a>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Meta icon={User} label="Lead Auditor" value={schedule.lead_auditor?.name ?? '—'} />
                    <Meta icon={Calendar} label="Jumlah Bagian" value={String(schedule.audits.length)} />
                    <Meta icon={ShieldCheck} label="Disetujui MR" value={schedule.mr?.name ? `${schedule.mr.name}` : '—'} />
                    <Meta icon={Mail} label="Dibagikan oleh" value={schedule.shared_by?.name ?? '—'} />
                </div>

                {/* Approval / Share workflow */}
                <div className="grid gap-3 md:grid-cols-2">
                    <MrPanel schedule={schedule} canApproveMr={canApproveMr} />
                    <SharePanel schedule={schedule} canShare={canShare} />
                </div>

                {/* Delivery report — per-address email status after sharing */}
                <DeliveryReportPanel schedule={schedule} report={deliveryReport ?? []} canShare={canShare} />

                {/* Bagian rows */}
                <Card>
                    <CardContent className="overflow-x-auto p-0">
                        <table className="w-full text-sm">
                            <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 text-left">No</th>
                                    <th className="px-4 py-2 text-left">Bagian / Departemen</th>
                                    <th className="px-4 py-2 text-left">Tanggal</th>
                                    <th className="px-4 py-2 text-left">Jam</th>
                                    <th className="px-4 py-2 text-left">Lokasi</th>
                                    <th className="px-4 py-2 text-left">Auditor</th>
                                    <th className="px-4 py-2 text-left">Audit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {schedule.audits.length === 0 && (
                                    <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Belum ada bagian.</td></tr>
                                )}
                                {schedule.audits.map((a, i) => (
                                    <tr key={a.id} className="hover:bg-muted/40">
                                        <td className="px-4 py-2">{i + 1}</td>
                                        <td className="px-4 py-2 font-medium">{a.department?.name ?? a.title}</td>
                                        <td className="px-4 py-2 font-mono text-xs">{a.planned_date}</td>
                                        <td className="px-4 py-2 text-xs">{a.jam_pelaksanaan ?? '—'}</td>
                                        <td className="px-4 py-2 text-xs">{a.location ?? '—'}</td>
                                        <td className="px-4 py-2 text-xs">{(a.team ?? []).length} auditor</td>
                                        <td className="px-4 py-2">
                                            <Link href={`/audits/${a.id}`} className="font-mono text-xs text-[#b91c1c] hover:underline">
                                                {a.code}
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>

            {canEdit && (
                <AuditFormDialog
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    departments={departments}
                    users={users}
                    schedule={{
                        id: schedule.id,
                        period_label: schedule.period_label,
                        standards,
                        type: schedule.type,
                        lead_auditor_id: schedule.lead_auditor?.id ?? null,
                        scope: schedule.scope,
                        objectives: schedule.objectives,
                        opening_at: schedule.opening_at,
                        closing_at: schedule.closing_at,
                        opening_location: schedule.opening_location,
                        closing_location: schedule.closing_location,
                        audit_categories: schedule.audit_categories,
                        rows: editRows,
                    }}
                />
            )}
        </AppLayout>
    );
}

function Meta({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
    return (
        <Card>
            <CardContent className="p-3">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Icon className="size-3.5" /> {label}</div>
                <div className="mt-0.5 text-sm font-semibold">{value}</div>
            </CardContent>
        </Card>
    );
}

function MrPanel({ schedule, canApproveMr }: { schedule: Schedule; canApproveMr?: boolean }) {
    const [note, setNote] = useState('');
    const approve = useForm({ note: '' });
    const reject = useForm({ note: '' });

    if (schedule.status !== 'pending_review') {
        return (
            <Card>
                <CardContent className="p-4 text-xs">
                    <div className="text-sm font-semibold">Review &amp; Approval Management Representative</div>
                    {schedule.mr_signed_at ? (
                        <div className={`mt-1 ${schedule.status === 'rejected' ? 'text-red-700' : 'text-emerald-700'}`}>
                            {schedule.status === 'rejected' ? <X className="size-3 inline" /> : <Check className="size-3 inline" />}{' '}
                            {schedule.status === 'rejected' ? 'Ditolak' : 'Disetujui'} oleh {schedule.mr?.name ?? '—'} pada {schedule.mr_signed_at}
                        </div>
                    ) : <div className="mt-1 text-muted-foreground">—</div>}
                    {schedule.mr_note && <div className="mt-1 italic text-muted-foreground">"{schedule.mr_note}"</div>}
                </CardContent>
            </Card>
        );
    }

    if (!canApproveMr) {
        return (
            <Card>
                <CardContent className="p-4 text-xs">
                    <div className="text-sm font-semibold">Review &amp; Approval Management Representative</div>
                    <div className="mt-1 text-amber-700">Menunggu review &amp; tanda tangan Management Representative.</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-4 space-y-2">
                <div className="text-sm font-semibold">Aksi: Review &amp; Approval (MR)</div>
                <Textarea rows={2} placeholder="Catatan (wajib bila menolak)" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="flex gap-2">
                    <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        disabled={approve.processing}
                        onClick={() => {
                            approve.transform(() => ({ note }));
                            approve.post(`/audit-schedules/${schedule.id}/approve`, { preserveScroll: true });
                        }}
                    >
                        <ShieldCheck className="size-4" /> Setujui &amp; Tanda Tangan
                    </Button>
                    <Button
                        variant="outline"
                        className="border-red-400 text-red-700"
                        disabled={reject.processing || !note}
                        onClick={() => {
                            reject.transform(() => ({ note }));
                            reject.post(`/audit-schedules/${schedule.id}/reject`, { preserveScroll: true });
                        }}
                    >
                        <X className="size-4" /> Tolak
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function SharePanel({ schedule, canShare }: { schedule: Schedule; canShare?: boolean }) {
    const share = useForm({});

    if (schedule.status === 'shared') {
        return (
            <Card>
                <CardContent className="p-4 text-xs">
                    <div className="text-sm font-semibold">Bagikan ke Email (Document Control)</div>
                    <div className="mt-1 text-emerald-700"><Mail className="size-3 inline" /> Dibagikan oleh {schedule.shared_by?.name ?? '—'} pada {schedule.shared_at}</div>
                </CardContent>
            </Card>
        );
    }

    const disabledReason =
        schedule.status === 'pending_review' ? 'Menunggu approval MR terlebih dahulu.'
        : schedule.status === 'rejected' ? 'Jadwal ditolak — tidak dapat dibagikan.'
        : null;

    return (
        <Card>
            <CardContent className="p-4 space-y-2">
                <div className="text-sm font-semibold">Bagikan ke Email (Document Control)</div>
                {disabledReason && <div className="text-xs text-amber-700">{disabledReason}</div>}
                {!canShare && schedule.status === 'approved' && (
                    <div className="text-xs text-muted-foreground">Hanya Document Control yang dapat membagikan.</div>
                )}
                {canShare && (
                    <Button
                        className="w-full bg-[#b91c1c] hover:bg-[#7f1d1d]"
                        disabled={share.processing || schedule.status !== 'approved'}
                        onClick={() => share.post(`/audit-schedules/${schedule.id}/share`, { preserveScroll: true })}
                    >
                        <Mail className="size-4" /> Bagikan ke Email (Auditee, Auditor &amp; Atasan)
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

const ROLE_LABEL: Record<string, string> = {
    auditee: 'Auditee',
    auditor: 'Auditor',
    cc: 'CC / Atasan',
};

function DeliveryReportPanel({
    schedule, report, canShare,
}: {
    schedule: Schedule;
    report: DeliveryRow[];
    canShare?: boolean;
}) {
    const resend = useForm({});

    // Only meaningful once the schedule has been shared at least once.
    if (schedule.status !== 'shared' && report.length === 0) return null;

    const sentCount    = report.filter((r) => r.status === 'sent' || r.status === 'skipped').length;
    const failedCount  = report.filter((r) => r.status === 'failed').length;

    return (
        <Card>
            <CardContent className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <div className="text-sm font-semibold">Delivery Report — Status Kirim Email</div>
                        <div className="text-xs text-muted-foreground">
                            {report.length > 0
                                ? <>Terkirim: <span className="font-medium text-emerald-600">{sentCount}</span> · Gagal: <span className="font-medium text-red-600">{failedCount}</span></>
                                : 'Belum ada data pengiriman rinci. Klik "Kirim Ulang" untuk mengirim & merekam status.'}
                        </div>
                    </div>
                    {canShare && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            disabled={resend.processing}
                            onClick={() => resend.post(`/audit-schedules/${schedule.id}/resend`, { preserveScroll: true })}
                            title="Kirim ulang hanya ke penerima yang belum menerima (mis. auditor yang gagal/terlewat)"
                        >
                            <RefreshCw className={`size-4 ${resend.processing ? 'animate-spin' : ''}`} /> Kirim Ulang ke yang Belum Terkirim
                        </Button>
                    )}
                </div>

                {report.length > 0 && (
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold">Nama</th>
                                    <th className="px-3 py-2 text-left font-semibold">Email</th>
                                    <th className="px-3 py-2 text-left font-semibold">Peran</th>
                                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {report.map((r, i) => (
                                    <tr key={`${r.email ?? r.name}-${i}`} className="hover:bg-muted/30">
                                        <td className="px-3 py-2">{r.name}</td>
                                        <td className="px-3 py-2 font-mono">{r.email ?? <span className="italic text-red-600">tanpa email</span>}</td>
                                        <td className="px-3 py-2">{ROLE_LABEL[r.role] ?? r.role}</td>
                                        <td className="px-3 py-2">
                                            {r.status === 'failed' ? (
                                                <span className="inline-flex items-center gap-1 text-red-600" title={r.error ?? ''}>
                                                    <XCircle className="size-3.5" /> Gagal
                                                </span>
                                            ) : r.status === 'skipped' ? (
                                                <span className="inline-flex items-center gap-1 text-emerald-600/80">
                                                    <CheckCircle2 className="size-3.5" /> Sudah terkirim
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-emerald-600">
                                                    <CheckCircle2 className="size-3.5" /> Terkirim
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
