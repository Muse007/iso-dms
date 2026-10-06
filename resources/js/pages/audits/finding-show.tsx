import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { AuditFindingFormDialog } from '@/components/audit-finding-form-dialog';
import { FilePicker } from '@/components/file-picker';
import { Head, router, useForm } from '@inertiajs/react';
import { AlertTriangle, Check, ChevronDown, FileText, Image, Loader2, MessageCircle, Paperclip, Pencil, Plus, Send, ShieldCheck, Trash2, UserCheck, X } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface Finding {
    id: number;
    reference: string | null;
    category: string;
    clause: string | null;
    description: string;
    evidence: string | null;
    evidence_files: string[] | null;
    action_evidence_files: string[] | null;
    preventive_action_evidence_files: string[] | null;
    root_cause: string | null;
    root_causes: string[] | null;
    corrective_action: string | null;
    preventive_action: string | null;
    status: string;
    due_date: string | null;
    finding_owner_id: number | null;
    submitted_at: string | null;
    approved_at: string | null;
    approval_note: string | null;
    auditor_verified_at: string | null;
    auditor_verification_note: string | null;
    verified_at: string | null;
    verification_note: string | null;
    closed_at: string | null;
    owner?: { id: number; name: string; department?: { name: string } } | null;
    auditor?: { id: number; name: string } | null;
    approver?: { id: number; name: string } | null;
    verifier?: { id: number; name: string } | null;
    events?: FindingEvent[];
}

interface FindingEvent {
    id: number;
    action: string;
    stage: string | null;
    note: string | null;
    /** Jejak terstruktur dari sistem (mis. jumlah bukti yang diterima saat submit). */
    meta?: { action_evidence_count?: number; preventive_evidence_count?: number; files_received?: number } | null;
    created_at: string;
    user?: { id: number; name: string } | null;
}

interface Audit {
    id: number;
    code: string;
    title: string;
    department?: { name: string } | null;
}

interface Props {
    audit: Audit;
    finding: Finding;
    users?: { id: number; name: string; department_id: number | null }[];
    canApprove?: boolean;
    canAuditorVerify?: boolean;
    canLeadVerify?: boolean;
    canSubmitAction?: boolean;
    waReminder?: { role: string; targetName: string | null; url: string | null; reason: string | null } | null;
    canEditFinding?: boolean;
}

const categoryBadge: Record<string, string> = {
    opportunity: 'bg-emerald-100 text-emerald-700',
    minor_nc:    'bg-amber-100 text-amber-700',
    major_nc:    'bg-red-100 text-red-700',
};
const categoryLabel: Record<string, string> = {
    opportunity: 'PFI',
    minor_nc:    'Minor',
    major_nc:    'Major',
};

const statusLabel: Record<string, string> = {
    open:                         'Open',
    in_progress:                  'In Progress',
    waiting_approval:             'Waiting Approval',
    waiting_auditor_verification: 'Waiting Auditor Verification',
    waiting_verification:         'Waiting Lead Verification',
    closed:                       'Closed',
    rejected:                     'Rejected',
};

const isPfiCategory = (c: string) => c === 'opportunity';

export default function FindingShow({ audit, finding, users, canApprove, canAuditorVerify, canLeadVerify, canSubmitAction, waReminder, canEditFinding }: Props) {
    const isPfi = isPfiCategory(finding.category);
    const [editOpen, setEditOpen] = useState(false);
    const deleteFinding = () => {
        if (!confirm(`Hapus temuan ${finding.reference ?? ''}? Tindakan ini tidak dapat dibatalkan.`)) return;
        router.delete(`/audits/${audit.id}/findings/${finding.id}`);
    };
    return (
        <AppLayout breadcrumbs={[
            { title: 'Internal Audit', href: '/audits' },
            { title: audit.code, href: `/audits/${audit.id}` },
            { title: finding.reference ?? `F-${finding.id}`, href: '#' },
        ]}>
            <Head title={`${finding.reference ?? 'Finding'} · ${audit.code}`} />

            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground font-mono">{finding.reference ?? `F-${finding.id}`}</div>
                        <h1 className="text-2xl font-extrabold tracking-tight">{finding.description.slice(0, 110)}</h1>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Badge className={categoryBadge[finding.category]}>{categoryLabel[finding.category] ?? finding.category}</Badge>
                            <Badge variant="outline">{statusLabel[finding.status] ?? finding.status}</Badge>
                            {finding.clause && <Badge variant="outline">Klausul {finding.clause}</Badge>}
                            {finding.due_date && <Badge variant="outline">Due {finding.due_date}</Badge>}
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {canEditFinding && (
                            <>
                                <Button variant="outline" onClick={() => setEditOpen(true)}>
                                    <Pencil className="size-4" /> Edit
                                </Button>
                                <Button variant="outline" onClick={deleteFinding} className="border-red-300 text-red-700 hover:bg-red-50">
                                    <Trash2 className="size-4" /> Hapus
                                </Button>
                            </>
                        )}
                        {waReminder && waReminder.url && (
                            <Button asChild className="bg-[#25D366] text-white hover:bg-[#1da851]">
                                <a href={waReminder.url} target="_blank" rel="noreferrer">
                                    <MessageCircle className="size-4" /> Ingatkan {waReminder.role} via WhatsApp
                                </a>
                            </Button>
                        )}
                        {waReminder && !waReminder.url && (
                            <Button
                                variant="outline"
                                disabled
                                title={
                                    waReminder.reason === 'no_phone'
                                        ? `Nomor WhatsApp ${waReminder.targetName ?? 'PIC'} belum diisi di profil pengguna.`
                                        : 'PIC untuk tahap ini belum ditentukan.'
                                }
                                className="opacity-70"
                            >
                                <MessageCircle className="size-4" /> WA {waReminder.role}: {waReminder.reason === 'no_phone' ? 'no. HP kosong' : 'PIC belum ada'}
                            </Button>
                        )}
                        {finding.status === 'closed' && (
                            <Button asChild className="bg-[#b91c1c] hover:bg-[#7f1d1d]">
                                <a href={`/audits/${audit.id}/findings/${finding.id}/report-pdf`} target="_blank" rel="noreferrer">
                                    <FileText className="size-4" /> Cetak PDF (FM-BDK-011)
                                </a>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {/* LEFT: content */}
                    <div className="space-y-3 md:col-span-2">
                        <Card>
                            <CardContent className="p-4">
                                <div className="mb-1 text-sm font-semibold">1. Deskripsi Temuan</div>
                                <p className="whitespace-pre-line text-sm">{finding.description}</p>
                                {finding.evidence && (
                                    <p className="mt-2 text-xs text-muted-foreground"><b>Catatan evidence:</b> {finding.evidence}</p>
                                )}
                                <FileList files={finding.evidence_files} label="Evidence Auditor" />
                            </CardContent>
                        </Card>

                        <RevisionNotice finding={finding} />

                        <CorrectiveActionPanel audit={audit} finding={finding} isPfi={isPfi} canSubmitAction={canSubmitAction} />

                        <Card>
                            <CardContent className="p-4">
                                <div className="mb-1 text-sm font-semibold">Evidence Perbaikan</div>
                                <FileList files={finding.action_evidence_files} label="Bukti Corrective Action" />
                                {!isPfi && <FileList files={finding.preventive_action_evidence_files} label="Bukti Preventive Action" />}
                                {(!finding.action_evidence_files?.length && !finding.preventive_action_evidence_files?.length) && (
                                    <p className="text-xs text-muted-foreground">Belum ada bukti perbaikan.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT: timeline + actions */}
                    <div className="space-y-3">
                        <Card>
                            <CardContent className="p-4">
                                <div className="mb-2 text-sm font-semibold">Timeline</div>
                                <Timeline finding={finding} isPfi={isPfi} />
                            </CardContent>
                        </Card>

                        {!isPfi && <ApprovalPanel audit={audit} finding={finding} canApprove={canApprove} />}
                        <AuditorVerificationPanel audit={audit} finding={finding} canAuditorVerify={canAuditorVerify} />
                        <VerificationPanel audit={audit} finding={finding} canLeadVerify={canLeadVerify} />
                        <ActivityLog finding={finding} />
                    </div>
                </div>
            </div>

            {canEditFinding && (
                <AuditFindingFormDialog
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    auditId={audit.id}
                    users={users ?? []}
                    finding={{
                        id: finding.id,
                        category: finding.category,
                        clause: finding.clause,
                        description: finding.description,
                        evidence: finding.evidence,
                        finding_owner_id: finding.finding_owner_id,
                        due_date: finding.due_date,
                    }}
                />
            )}
        </AppLayout>
    );
}

function FileList({ files, label }: { files: string[] | null; label: string }) {
    if (!files || files.length === 0) return null;
    return (
        <div className="mt-3">
            <div className="mb-1 text-xs font-semibold text-muted-foreground">{label}</div>
            <div className="flex flex-wrap gap-2">
                {files.map((path) => {
                    const url = `/storage/${path}`;
                    const isImg = /\.(jpg|jpeg|png|webp)$/i.test(path);
                    return (
                        <a
                            key={path}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded border px-2 py-1 text-xs hover:bg-muted"
                        >
                            {isImg ? <Image className="size-3.5" /> : <FileText className="size-3.5" />}
                            {path.split('/').pop()}
                        </a>
                    );
                })}
            </div>
        </div>
    );
}

function Timeline({ finding, isPfi }: { finding: Finding; isPfi: boolean }) {
    const items: Array<{ done: boolean; current: boolean; label: string; meta: string | null }> = [
        { done: true, current: false, label: 'Temuan dibuat (auditor)', meta: null },
        {
            done: !!finding.submitted_at,
            current: ['open', 'in_progress'].includes(finding.status),
            label: 'Auditee submit perbaikan',
            meta: finding.submitted_at,
        },
    ];

    if (!isPfi) {
        items.push({
            done: !!finding.approved_at,
            current: finding.status === 'waiting_approval',
            label: 'Approval atasan auditee',
            meta: finding.approved_at,
        });
    }

    items.push(
        {
            done: !!finding.auditor_verified_at,
            current: finding.status === 'waiting_auditor_verification',
            label: 'Verifikasi auditor',
            meta: finding.auditor_verified_at,
        },
        {
            done: !!finding.verified_at,
            current: finding.status === 'waiting_verification',
            label: 'Verifikasi Lead Auditor',
            meta: finding.verified_at,
        },
        {
            done: finding.status === 'closed',
            current: false,
            label: 'Closed',
            meta: finding.closed_at,
        },
    );

    return (
        <div>
            {items.map((it, i) => {
                const isLast = i === items.length - 1;
                return (
                    <div key={i} className={`flex gap-3 ${!it.done && !it.current ? 'opacity-40' : ''}`}>
                        {/* Kolom penanda: titik status + anak panah penghubung ke tahap berikutnya.
                            Tahap berjalan (amber) berkedip agar mudah dikenali sekilas. */}
                        <div className="flex w-4 shrink-0 flex-col items-center">
                            <span
                                className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
                                    it.done ? 'bg-emerald-500'
                                    : it.current ? 'animate-pulse bg-amber-500 ring-2 ring-amber-300'
                                    : 'bg-slate-300'
                                }`}
                            />
                            {!isLast && (
                                <ChevronDown
                                    className={`-my-0.5 size-4 ${
                                        it.done ? 'text-emerald-500'
                                        : it.current ? 'animate-pulse text-amber-500'
                                        : 'text-slate-300'
                                    }`}
                                />
                            )}
                        </div>
                        <div className={`text-xs ${isLast ? '' : 'pb-3'}`}>
                            <div className={`font-semibold ${it.current ? 'text-amber-600' : ''}`}>{it.label}</div>
                            {it.meta && <div className="text-muted-foreground">{it.meta}</div>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/** Pad/normalise root causes to at least 3 entries for the editor. */
function initRootCauses(rc: string[] | null): string[] {
    const base = (rc ?? []).filter((x) => typeof x === 'string');
    while (base.length < 3) base.push('');
    return base.slice(0, 5);
}

/** Banner untuk auditee: menampilkan catatan reviewer saat temuan dikembalikan untuk revisi / ditolak. */
function RevisionNotice({ finding }: { finding: Finding }) {
    if (!['in_progress', 'rejected'].includes(finding.status)) return null;

    const notes = [
        { note: finding.auditor_verification_note, who: finding.auditor?.name, role: 'Verifikasi Auditor' },
        { note: finding.verification_note, who: finding.verifier?.name, role: 'Verifikasi Lead Auditor' },
        { note: finding.approval_note, who: finding.approver?.name, role: 'Atasan Auditee' },
    ].filter((n) => n.note && n.note.trim() !== '');

    if (notes.length === 0) return null;

    const isRejected = finding.status === 'rejected';

    return (
        <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                    <AlertTriangle className="size-4" />
                    {isRejected ? 'Temuan Ditolak' : 'Dikembalikan untuk Revisi'}
                </div>
                <p className="mt-1 text-xs text-amber-700">
                    {isRejected
                        ? 'Temuan ini ditolak reviewer. Catatan:'
                        : 'Reviewer meminta perbaikan. Silakan tindak lanjuti catatan berikut lalu submit ulang tindakan perbaikan.'}
                </p>
                <div className="mt-2 space-y-2">
                    {notes.map((n, i) => (
                        <div key={i} className="rounded border border-amber-200 bg-white p-2">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                                {n.role}{n.who ? ` · ${n.who}` : ''}
                            </div>
                            <div className="mt-0.5 whitespace-pre-line text-sm text-slate-700">"{n.note}"</div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

const eventLabel: Record<string, string> = {
    created:            'Temuan dibuat',
    submitted:          'Auditee submit tindakan perbaikan',
    approved:           'Disetujui atasan',
    revision_requested: 'Diminta revisi',
    rejected:           'Temuan ditolak',
    auditor_verified:   'Diverifikasi auditor',
    lead_verified:      'Diverifikasi & ditutup Lead Auditor',
};
const eventStageLabel: Record<string, string> = {
    auditee: 'Auditee', atasan: 'Atasan', auditor: 'Auditor', lead: 'Lead Auditor',
};
const fmtDateTime = (s: string) => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

/** Log aktivitas / riwayat revisi temuan (append-only, kronologis). */
function ActivityLog({ finding }: { finding: Finding }) {
    const events = finding.events ?? [];
    if (events.length === 0) return null;

    return (
        <Card>
            <CardContent className="p-4">
                <div className="mb-3 text-sm font-semibold">Log Aktivitas / Riwayat Revisi</div>
                <div className="space-y-3">
                    {events.map((e) => {
                        const isReject = e.action === 'revision_requested' || e.action === 'rejected';
                        const dot = isReject ? 'bg-red-500' : e.action === 'lead_verified' ? 'bg-emerald-500' : 'bg-slate-400';
                        return (
                            <div key={e.id} className="flex gap-3">
                                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dot}`} />
                                <div className="min-w-0 flex-1 text-xs">
                                    <div className="font-semibold">
                                        {eventLabel[e.action] ?? e.action}
                                        {isReject && <span className="ml-1 rounded bg-red-100 px-1 py-0.5 text-[10px] font-medium text-red-700">revisi</span>}
                                    </div>
                                    <div className="text-muted-foreground">
                                        {e.user?.name ?? '—'}
                                        {e.stage ? ` · ${eventStageLabel[e.stage] ?? e.stage}` : ''} · {fmtDateTime(e.created_at)}
                                    </div>
                                    {e.note && (
                                        <div className="mt-1 whitespace-pre-line rounded border border-amber-200 bg-amber-50 px-2 py-1 italic text-slate-700">
                                            "{e.note}"
                                        </div>
                                    )}
                                    {e.action === 'submitted' && e.meta && (
                                        <div className="mt-1 text-[11px] text-muted-foreground">
                                            <Paperclip className="mr-0.5 inline size-3" />
                                            {e.meta.action_evidence_count ?? 0} bukti corrective
                                            {(e.meta.preventive_evidence_count ?? 0) > 0 &&
                                                ` · ${e.meta.preventive_evidence_count} bukti preventive`}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

function CorrectiveActionPanel({ audit, finding, isPfi, canSubmitAction }: { audit: Audit; finding: Finding; isPfi: boolean; canSubmitAction?: boolean }) {
    const form = useForm<{
        root_causes: string[];
        corrective_action: string;
        preventive_action: string;
        due_date: string;
        action_evidence_files: File[];
        preventive_action_evidence_files: File[];
    }>({
        root_causes: initRootCauses(finding.root_causes ?? (finding.root_cause ? [finding.root_cause] : null)),
        corrective_action: finding.corrective_action ?? '',
        preventive_action: finding.preventive_action ?? '',
        due_date: finding.due_date ?? '',
        action_evidence_files: [],
        preventive_action_evidence_files: [],
    });

    // Hanya auditee (PIC temuan) yang boleh mengisi & submit — dan hanya saat status masih terbuka.
    const editable = !!canSubmitAction && ['open', 'in_progress', 'rejected'].includes(finding.status);

    // Ada berkas yang ditolak FilePicker → submit dikunci. Tanpa ini berkas
    // yang gagal dilampirkan hanya lenyap dari layar sementara form tetap
    // terkirim, dan temuan tersimpan tanpa bukti.
    const [caBlocked, setCaBlocked] = useState(false);
    const [paBlocked, setPaBlocked] = useState(false);
    const blocked = caBlocked || paBlocked;

    // Bukti corrective action wajib; yang sudah tersimpan di server ikut dihitung
    // supaya submit ulang pasca-revisi tidak menuntut unggah ulang.
    const hasCaEvidence = (finding.action_evidence_files?.length ?? 0) > 0 || form.data.action_evidence_files.length > 0;
    const rc = form.data.root_causes;
    const setRc = (i: number, v: string) => form.setData('root_causes', rc.map((x, idx) => (idx === i ? v : x)));
    const addRc = () => rc.length < 5 && form.setData('root_causes', [...rc, '']);
    const removeRc = (i: number) => rc.length > 3 && form.setData('root_causes', rc.filter((_, idx) => idx !== i));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(`/audits/${audit.id}/findings/${finding.id}/submit-action`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.setData('action_evidence_files', []);
                form.setData('preventive_action_evidence_files', []);
            },
        });
    };

    return (
        <Card>
            <CardContent className="p-4">
                <div className="mb-2 text-sm font-semibold">
                    Tindakan Perbaikan {!editable && <Badge variant="outline" className="ml-2">read-only</Badge>}
                </div>
                <form onSubmit={submit} className="space-y-3">
                    {/* Root cause — Minor/Major saja (PFI langsung perbaikan) */}
                    {!isPfi && (
                        <div>
                            <div className="flex items-center justify-between">
                                <Label className="text-xs">Root Cause Analysis (1–3 wajib, maks 5) <span className="text-red-600">*</span></Label>
                                {editable && (
                                    <Button type="button" size="sm" variant="ghost" className="h-6 gap-1 text-[11px]" onClick={addRc} disabled={rc.length >= 5}>
                                        <Plus className="size-3" /> Tambah
                                    </Button>
                                )}
                            </div>
                            <div className="mt-1 space-y-1.5">
                                {rc.map((c, i) => (
                                    <div key={i} className={`flex gap-1.5 ${editable ? 'items-start' : 'items-baseline'}`}>
                                        <span className="w-5 shrink-0 pt-1.5 text-center text-xs text-muted-foreground">{i + 1}.</span>
                                        {editable ? (
                                            <>
                                                {/* Textarea (bukan Input satu baris) supaya akar masalah yang
                                                    panjang tetap terbaca utuh sambil diketik. */}
                                                <Textarea
                                                    className="min-h-16 py-1.5 text-sm"
                                                    rows={2}
                                                    value={c}
                                                    onChange={(e) => setRc(i, e.target.value)}
                                                    required={i < 3}
                                                    placeholder={i < 3 ? `Akar masalah #${i + 1} (wajib)` : `Akar masalah #${i + 1} (opsional)`}
                                                />
                                                {/* Hanya baris ke-4 & ke-5 (opsional) yang bisa dihapus; 1–3 tetap. */}
                                                {i >= 3 ? (
                                                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-red-600" onClick={() => removeRc(i)}>
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                ) : (
                                                    <span className="w-8 shrink-0" />
                                                )}
                                            </>
                                        ) : (
                                            /* Read-only: teks dibungkus penuh. Sebelumnya memakai <Input> disabled
                                               yang memotong isi panjang dan tidak bisa di-scroll maupun difokus. */
                                            <p className="flex-1 whitespace-pre-wrap break-words rounded border bg-muted/40 px-2 py-1.5 text-sm leading-relaxed">
                                                {c || <span className="text-muted-foreground">—</span>}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {form.errors.root_causes && <p className="text-xs text-red-600 mt-1">{form.errors.root_causes}</p>}
                        </div>
                    )}

                    <div>
                        <Label className="text-xs">Corrective Action (perbaikan) <span className="text-red-600">*</span></Label>
                        <Textarea
                            rows={3}
                            value={form.data.corrective_action}
                            onChange={(e) => form.setData('corrective_action', e.target.value)}
                            disabled={!editable}
                            required={editable}
                        />
                        {editable && (
                            <>
                            <FilePicker
                                className="mt-2"
                                label="Bukti Corrective Action"
                                required
                                value={form.data.action_evidence_files}
                                onChange={(files) => form.setData('action_evidence_files', files)}
                                onBlockedChange={setCaBlocked}
                                error={
                                    (form.errors as Record<string, string>)['action_evidence_files'] ??
                                    (form.errors as Record<string, string>)['action_evidence_files.0']
                                }
                            />
                            {!hasCaEvidence && (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    Wajib: lampirkan minimal 1 bukti pelaksanaan perbaikan (foto/scan/PDF).
                                </p>
                            )}
                            </>
                        )}
                    </div>

                    {/* Preventive action — Minor/Major saja */}
                    {!isPfi && (
                        <div>
                            <Label className="text-xs">Preventive Action (pencegahan) <span className="text-red-600">*</span></Label>
                            <Textarea
                                rows={3}
                                value={form.data.preventive_action}
                                onChange={(e) => form.setData('preventive_action', e.target.value)}
                                disabled={!editable}
                                required={editable}
                            />
                            {editable && (
                                <FilePicker
                                    className="mt-2"
                                    label="Bukti Preventive Action (opsional)"
                                    value={form.data.preventive_action_evidence_files}
                                    onChange={(files) => form.setData('preventive_action_evidence_files', files)}
                                    onBlockedChange={setPaBlocked}
                                    error={
                                        (form.errors as Record<string, string>)['preventive_action_evidence_files'] ??
                                        (form.errors as Record<string, string>)['preventive_action_evidence_files.0']
                                    }
                                />
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Due Date <span className="font-normal text-muted-foreground">(ditetapkan auditor)</span></Label>
                            <Input
                                type="date"
                                value={form.data.due_date}
                                disabled
                                readOnly
                                className="cursor-not-allowed bg-muted/50"
                            />
                        </div>
                    </div>

                    {editable && (
                        <div className="flex items-center justify-end gap-3">
                            {(blocked || !hasCaEvidence) && (
                                <span className="text-[11px] text-red-700">
                                    {blocked
                                        ? 'Singkirkan berkas bertanda merah dulu.'
                                        : 'Bukti corrective action belum dilampirkan.'}
                                </span>
                            )}
                            <Button
                                type="submit"
                                className="bg-[#b91c1c] hover:bg-[#7f1d1d]"
                                disabled={form.processing || blocked || !hasCaEvidence}
                            >
                                {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                {isPfi ? 'Submit Perbaikan' : 'Submit untuk Approval'}
                            </Button>
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}

function ApprovalPanel({ audit, finding, canApprove }: { audit: Audit; finding: Finding; canApprove?: boolean }) {
    const [note, setNote] = useState('');
    const approve = useForm({ note: '' });
    const reject  = useForm({ note: '', kind: 'revise' });

    if (finding.status !== 'waiting_approval') {
        if (finding.approved_at) {
            return (
                <Card>
                    <CardContent className="p-4 text-xs">
                        <div className="text-sm font-semibold">Approval Atasan</div>
                        <div className="mt-1 text-emerald-700"><Check className="size-3 inline" /> Approved oleh {finding.approver?.name ?? '—'} pada {finding.approved_at}</div>
                        {finding.approval_note && <div className="mt-1 italic text-muted-foreground">"{finding.approval_note}"</div>}
                    </CardContent>
                </Card>
            );
        }
        return null;
    }

    if (!canApprove) {
        return (
            <Card>
                <CardContent className="p-4 text-xs">
                    <div className="text-sm font-semibold">Approval Atasan</div>
                    <div className="mt-1 text-amber-700">Menunggu approval atasan auditee.</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-4 space-y-2">
                <div className="text-sm font-semibold">Aksi: Approval Atasan Auditee</div>
                <Textarea
                    rows={2}
                    placeholder="Catatan (opsional untuk approve, wajib untuk reject/revisi)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex gap-2">
                    <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                            approve.transform(() => ({ note }));
                            approve.post(`/audits/${audit.id}/findings/${finding.id}/approve`, { preserveScroll: true });
                        }}
                        disabled={approve.processing}
                    >
                        <Check className="size-4" /> Approve
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1 border-amber-400 text-amber-700"
                        onClick={() => {
                            reject.transform(() => ({ note, kind: 'revise' }));
                            reject.post(`/audits/${audit.id}/findings/${finding.id}/reject`, { preserveScroll: true });
                        }}
                        disabled={reject.processing || !note}
                    >
                        Minta Revisi
                    </Button>
                    <Button
                        variant="outline"
                        className="border-red-400 text-red-700"
                        onClick={() => {
                            reject.transform(() => ({ note, kind: 'reject' }));
                            reject.post(`/audits/${audit.id}/findings/${finding.id}/reject`, { preserveScroll: true });
                        }}
                        disabled={reject.processing || !note}
                    >
                        <X className="size-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function AuditorVerificationPanel({ audit, finding, canAuditorVerify }: { audit: Audit; finding: Finding; canAuditorVerify?: boolean }) {
    const [note, setNote] = useState('');
    const verify = useForm({ note: '' });
    const reject = useForm({ note: '', kind: 'revise' });

    if (finding.status !== 'waiting_auditor_verification') {
        if (finding.auditor_verified_at) {
            return (
                <Card>
                    <CardContent className="p-4 text-xs">
                        <div className="text-sm font-semibold">Verifikasi Auditor</div>
                        <div className="mt-1 text-emerald-700"><UserCheck className="size-3 inline" /> Diverifikasi oleh {finding.auditor?.name ?? 'auditor'} pada {finding.auditor_verified_at}</div>
                        {finding.auditor_verification_note && <div className="mt-1 italic text-muted-foreground">"{finding.auditor_verification_note}"</div>}
                    </CardContent>
                </Card>
            );
        }
        return null;
    }

    if (!canAuditorVerify) {
        return (
            <Card>
                <CardContent className="p-4 text-xs">
                    <div className="text-sm font-semibold">Verifikasi Auditor</div>
                    <div className="mt-1 text-amber-700">Menunggu verifikasi auditor pembuat temuan{finding.auditor?.name ? ` (${finding.auditor.name})` : ''}.</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-4 space-y-2">
                <div className="text-sm font-semibold">Aksi: Verifikasi Auditor</div>
                <Textarea
                    rows={2}
                    placeholder="Catatan verifikasi auditor (opsional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex gap-2">
                    <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                            verify.transform(() => ({ note }));
                            verify.post(`/audits/${audit.id}/findings/${finding.id}/auditor-verify`, { preserveScroll: true });
                        }}
                        disabled={verify.processing}
                    >
                        <UserCheck className="size-4" /> Verifikasi &amp; Lanjut ke Lead
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1 border-red-400 text-red-700"
                        onClick={() => {
                            reject.transform(() => ({ note, kind: 'revise' }));
                            reject.post(`/audits/${audit.id}/findings/${finding.id}/reject`, { preserveScroll: true });
                        }}
                        disabled={reject.processing || !note}
                    >
                        <X className="size-4" /> Minta Revisi
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function VerificationPanel({ audit, finding, canLeadVerify }: { audit: Audit; finding: Finding; canLeadVerify?: boolean }) {
    const [note, setNote] = useState('');
    const verify = useForm({ note: '' });
    const reject = useForm({ note: '', kind: 'revise' });

    if (finding.status !== 'waiting_verification') {
        if (finding.verified_at) {
            return (
                <Card>
                    <CardContent className="p-4 text-xs">
                        <div className="text-sm font-semibold">Verifikasi Lead Auditor</div>
                        <div className="mt-1 text-emerald-700"><ShieldCheck className="size-3 inline" /> Verified oleh {finding.verifier?.name ?? '—'} pada {finding.verified_at}</div>
                        {finding.verification_note && <div className="mt-1 italic text-muted-foreground">"{finding.verification_note}"</div>}
                    </CardContent>
                </Card>
            );
        }
        return null;
    }

    if (!canLeadVerify) {
        return (
            <Card>
                <CardContent className="p-4 text-xs">
                    <div className="text-sm font-semibold">Verifikasi Lead Auditor</div>
                    <div className="mt-1 text-amber-700">Menunggu verifikasi Lead Auditor.</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-4 space-y-2">
                <div className="text-sm font-semibold">Aksi: Verifikasi Lead Auditor</div>
                <Textarea
                    rows={2}
                    placeholder="Catatan verifikasi (opsional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex gap-2">
                    <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                            verify.transform(() => ({ note }));
                            verify.post(`/audits/${audit.id}/findings/${finding.id}/verify`, { preserveScroll: true });
                        }}
                        disabled={verify.processing}
                    >
                        <ShieldCheck className="size-4" /> Verified &amp; Closed
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1 border-red-400 text-red-700"
                        onClick={() => {
                            reject.transform(() => ({ note, kind: 'revise' }));
                            reject.post(`/audits/${audit.id}/findings/${finding.id}/reject`, { preserveScroll: true });
                        }}
                        disabled={reject.processing || !note}
                    >
                        <X className="size-4" /> Minta Revisi
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
