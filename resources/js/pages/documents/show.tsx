import { DocumentFormDialog, type ApproverUser } from '@/components/document-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogTrigger } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { CalendarDays, CheckCircle2, Clock, Download, FileText, Pencil, Send, Trash2, UserRound } from 'lucide-react';
import {
    MobileBadge,
    MobileList,
    MobileListCard,
    MobileListEmpty,
    MobileMeta,
    mobileDate,
} from '@/components/mobile-list';
import { hasAnyClause, normalizeIsoClauses, OutlineNode, toOutline } from '@/lib/sop';

interface Version {
    id: number;
    revision: string;
    file_name: string;
    file_path: string;
    file_size: number;
    created_at: string;
    is_current: boolean;
    change_summary: string | null;
    author?: { name: string };
}
interface Approval {
    id: number;
    level: number;
    role_required: string;
    status: string;
    approver?: { name: string };
    decided_at: string | null;
    comment?: string | null;
}
interface ApproverRef { id: number; name: string; position?: string | null; signature_path?: string | null }
interface Document {
    id: number;
    code: string;
    title: string;
    type: string;
    standard: string;
    standards: string[] | null;
    status: string;
    current_revision: string;
    description: string | null;
    effective_date: string | null;
    next_review_date: string | null;
    department_id: number | null;
    department?: { id: number; name: string };
    owner?: { name: string };
    versions: Version[];
    approvals: Approval[];
    purpose: string | null;
    scope: string | null;
    references_list: string[] | null;
    iso_clauses: Record<string, string[]> | null;
    definitions: unknown;
    responsibilities: unknown;
    procedure_steps: unknown;
    related_documents: unknown;
    section_images: Record<string, string[]> | null;
    revision_history: unknown;
    prepared_by_user_id: number | null;
    prepared_by_name: string | null;
    prepared_by_date: string | null;
    prepared_by?: ApproverRef | null;
    reviewed_by_user_id: number | null;
    reviewed_by_name: string | null;
    reviewed_by_date: string | null;
    reviewed_by?: ApproverRef | null;
    reviewed_by_2_user_id: number | null;
    reviewed_by_2_name: string | null;
    reviewed_by_2_date: string | null;
    reviewed_by_two?: ApproverRef | null;
    reviewed_2_at: string | null;
    approved_by_user_id: number | null;
    approved_by_name: string | null;
    approved_by_date: string | null;
    approved_by?: ApproverRef | null;
    document_control_user_id: number | null;
    document_control?: (ApproverRef & { stamp_path?: string | null }) | null;
    reviewed_at: string | null;
    approved_at: string | null;
    doc_control_approved_at: string | null;
    flowchart_path: string | null;
}

const DOC_TYPE_LABEL: Record<string, string> = {
    policy: 'Kebijakan Perusahaan',
    anti_bribery: 'Kebijakan Anti Suap',
    sop: 'Prosedur',
    work_instruction: 'Instruksi Kerja',
    form: 'Form',
    record: 'Record',
    manual: 'Manual',
    other: 'Other',
};
const STANDARD_LABEL: Record<string, string> = {
    iso_9001: 'ISO 9001 : 2015',
    iso_14001: 'ISO 14001 : 2015',
    iso_45001: 'ISO 45001 : 2018',
    iatf: 'IATF 16949 : 2016',
    internal: 'Internal Standard',
};
interface Department { id: number; name: string }
interface Props { document: Document; departments: Department[]; users: ApproverUser[] }

const fmtSize = (n: number) =>
    n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export default function DocumentShow({ document, departments, users }: Props) {
    const submit = () => router.post(`/documents/${document.id}/submit`, {}, { preserveScroll: true });
    const destroy = () => {
        if (!window.confirm(`Delete ${document.code}?`)) return;
        router.delete(`/documents/${document.id}`);
    };

    const current = document.versions.find((v) => v.is_current);
    const standardList = (document.standards && document.standards.length > 0)
        ? document.standards
        : (document.standard ? [document.standard] : []);
    const isSop = document.type === 'sop';

    // SOP body — normalize stored values (handles legacy + new nested outline shapes).
    const isoClauses = normalizeIsoClauses(document.iso_clauses);
    const clausesPresent = hasAnyClause(isoClauses);
    const defs = toOutline(document.definitions);
    const resps = toOutline(document.responsibilities);
    const steps = toOutline(document.procedure_steps);
    const related = toOutline(document.related_documents);

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Documents', href: '/documents' },
                { title: document.code, href: `/documents/${document.id}` },
            ]}
        >
            <Head title={document.code} />
            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {DOC_TYPE_LABEL[document.type] ?? document.type} · {standardList.map((s) => STANDARD_LABEL[s] ?? s).join(' · ')}
                        </div>
                        <h1 className="text-2xl font-extrabold tracking-tight">{document.code}</h1>
                        <p className="text-sm text-muted-foreground">{document.title}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{document.status}</Badge>

                        {isSop && (
                            <Button asChild size="sm" variant="outline" className="gap-1.5">
                                <a href={`/documents/${document.id}/preview-pdf`} target="_blank" rel="noreferrer">
                                    <FileText className="size-4" /> Preview PDF
                                </a>
                            </Button>
                        )}

                        {current && (
                            <Button asChild size="sm" variant="outline" className="gap-1.5">
                                <a href={`/storage/${current.file_path}`} target="_blank" rel="noreferrer">
                                    <Download className="size-4" /> Current file
                                </a>
                            </Button>
                        )}

                        <DocumentFormDialog
                            document={{
                                id: document.id,
                                code: document.code,
                                title: document.title,
                                type: document.type,
                                standard: document.standard,
                                standards: document.standards,
                                department_id: document.department_id,
                                description: document.description,
                                effective_date: document.effective_date,
                                next_review_date: document.next_review_date,
                                current_revision: document.current_revision,
                                purpose: document.purpose,
                                scope: document.scope,
                                references_list: document.references_list,
                                iso_clauses: document.iso_clauses,
                                definitions: document.definitions,
                                responsibilities: document.responsibilities,
                                procedure_steps: document.procedure_steps,
                                related_documents: document.related_documents,
                                section_images: document.section_images,
                                revision_history: document.revision_history,
                                prepared_by_user_id: document.prepared_by_user_id,
                                prepared_by_name: document.prepared_by_name,
                                prepared_by_date: document.prepared_by_date,
                                reviewed_by_user_id: document.reviewed_by_user_id,
                                reviewed_by_name: document.reviewed_by_name,
                                reviewed_by_date: document.reviewed_by_date,
                                reviewed_by_2_user_id: document.reviewed_by_2_user_id,
                                reviewed_by_2_name: document.reviewed_by_2_name,
                                reviewed_by_2_date: document.reviewed_by_2_date,
                                approved_by_user_id: document.approved_by_user_id,
                                approved_by_name: document.approved_by_name,
                                approved_by_date: document.approved_by_date,
                                document_control_user_id: document.document_control_user_id,
                                flowchart_path: document.flowchart_path,
                            }}
                            departments={departments}
                            users={users}
                            trigger={
                                <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="gap-1.5">
                                        <Pencil className="size-4" /> Edit
                                    </Button>
                                </DialogTrigger>
                            }
                        />

                        {document.status === 'draft' && (
                            <Button onClick={submit} size="sm" className="gap-1.5 bg-[#b91c1c] hover:bg-[#991b1b]">
                                <Send className="size-4" /> Submit for approval
                            </Button>
                        )}

                        <Button onClick={destroy} size="sm" variant="ghost" className="gap-1.5 text-red-600 hover:bg-red-500/10 hover:text-red-700">
                            <Trash2 className="size-4" /> Delete
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <Card className="xl:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base">Metadata</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <dt className="text-xs text-muted-foreground">Department</dt>
                                    <dd>{document.department?.name ?? '—'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground">Owner</dt>
                                    <dd>{document.owner?.name ?? '—'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground">Current revision</dt>
                                    <dd className="font-mono">{document.current_revision}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground">Effective date</dt>
                                    <dd className="font-mono">{document.effective_date ?? '—'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground">Next review</dt>
                                    <dd className="font-mono">{document.next_review_date ?? '—'}</dd>
                                </div>
                            </dl>
                            {document.description && (
                                <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">
                                    {document.description}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Approval Trail</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {document.approvals.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Not submitted yet.</p>
                            ) : (
                                <ol className="space-y-3">
                                    {document.approvals.map((a) => (
                                        <li key={a.id} className="flex items-start gap-3">
                                            <div
                                                className={`mt-0.5 flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                                                    a.status === 'approved'
                                                        ? 'bg-emerald-500'
                                                        : a.status === 'pending'
                                                        ? 'bg-amber-500'
                                                        : 'bg-zinc-400'
                                                }`}
                                            >
                                                {a.status === 'approved' ? (
                                                    <CheckCircle2 className="size-3" />
                                                ) : (
                                                    <Clock className="size-3" />
                                                )}
                                            </div>
                                            <div className="flex-1 text-sm">
                                                <div className="font-semibold">
                                                    L{a.level} · {a.role_required}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {a.approver?.name ?? '—'} · {a.status}
                                                    {a.decided_at && ` · ${a.decided_at}`}
                                                </div>
                                                {a.comment && (
                                                    <div
                                                        className={`mt-1 rounded-md border-l-2 px-2 py-1 text-xs ${
                                                            a.status === 'revision'
                                                                ? 'border-blue-400 bg-blue-50 text-blue-800 dark:bg-blue-950/20'
                                                                : a.status === 'rejected'
                                                                ? 'border-red-400 bg-red-50 text-red-800 dark:bg-red-950/20'
                                                                : 'border-zinc-300 bg-muted/40'
                                                        }`}
                                                    >
                                                        <span className="font-semibold">
                                                            {a.status === 'revision'
                                                                ? 'Permintaan revisi: '
                                                                : a.status === 'rejected'
                                                                ? 'Alasan penolakan: '
                                                                : 'Catatan: '}
                                                        </span>
                                                        {a.comment}
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {isSop && (
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-2">
                            <div>
                                <CardTitle className="text-base">Digital Prosedur</CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    Mengikuti layout BTI PR-IT — preview PDF untuk format cetak resmi.
                                </p>
                            </div>
                            <Button asChild size="sm" className="gap-1.5 bg-[#b91c1c] hover:bg-[#991b1b]">
                                <a href={`/documents/${document.id}/preview-pdf`} target="_blank" rel="noreferrer">
                                    <FileText className="size-4" /> Open PDF
                                </a>
                            </Button>
                        </CardHeader>
                        <CardContent className="grid gap-5">
                            {/* Signature block — 4 columns: prepared shows immediately;
                                reviewed/approved gated on workflow timestamps; doc control gated on doc_control_approved_at */}
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <SignatureCell
                                    label="Dibuat Oleh"
                                    name={document.prepared_by?.name ?? document.prepared_by_name}
                                    date={document.prepared_by_date}
                                    fallback={document.owner?.name}
                                    signaturePath={document.prepared_by?.signature_path ?? null}
                                    showSignature
                                />
                                <SignatureCell
                                    label={document.reviewed_by_2_user_id ? 'Ditinjau Oleh (1)' : 'Ditinjau Oleh'}
                                    name={document.reviewed_by?.name ?? document.reviewed_by_name}
                                    date={document.reviewed_at}
                                    signaturePath={document.reviewed_by?.signature_path ?? null}
                                    showSignature={!!document.reviewed_at}
                                />
                                {document.reviewed_by_2_user_id && (
                                    <SignatureCell
                                        label="Ditinjau Oleh (2)"
                                        name={document.reviewed_by_two?.name ?? document.reviewed_by_2_name}
                                        date={document.reviewed_2_at}
                                        signaturePath={document.reviewed_by_two?.signature_path ?? null}
                                        showSignature={!!document.reviewed_2_at}
                                    />
                                )}
                                <SignatureCell
                                    label="Disetujui Oleh"
                                    name={document.approved_by?.name ?? document.approved_by_name}
                                    date={document.approved_at}
                                    signaturePath={document.approved_by?.signature_path ?? null}
                                    showSignature={!!document.approved_at}
                                />
                                <SignatureCell
                                    label="Document Control"
                                    name={document.document_control?.name}
                                    date={document.doc_control_approved_at}
                                    signaturePath={document.document_control?.stamp_path ?? null}
                                    showSignature={!!document.doc_control_approved_at}
                                    isStamp
                                />
                            </div>

                            {document.status === 'published' && document.doc_control_approved_at && (
                                <div className="rounded-md border-2 border-[#b91c1c] bg-red-50 p-3 text-sm dark:bg-red-950/20">
                                    <span className="font-bold text-[#b91c1c]">DOKUMEN SAH</span> — disahkan oleh Document
                                    Control <b>{document.document_control?.name}</b> pada {document.doc_control_approved_at}.
                                </div>
                            )}

                            <SopSection title="A. Tujuan">
                                {document.purpose ? (
                                    <p className="whitespace-pre-line text-sm">{document.purpose}</p>
                                ) : <Empty />}
                            </SopSection>

                            <SopSection title="B. Ruang Lingkup">
                                {document.scope ? (
                                    <p className="whitespace-pre-line text-sm">{document.scope}</p>
                                ) : <Empty />}
                            </SopSection>

                            <SopSection title="C. Acuan">
                                {clausesPresent ? (
                                    <div className="space-y-1 text-sm">
                                        {standardList.map((s, i) => {
                                            const cl = (isoClauses[s] ?? []).filter((c) => c.trim() !== '');
                                            return (
                                                <p key={s}>
                                                    <span className="font-semibold">C.{i + 1} {STANDARD_LABEL[s] ?? s}</span>
                                                    {cl.length > 0 ? ` — Klausul ${cl.join(', ')}` : ''}
                                                </p>
                                            );
                                        })}
                                    </div>
                                ) : document.references_list && document.references_list.length > 0 ? (
                                    <ul className="list-disc pl-5 text-sm">
                                        {document.references_list.map((r, i) => <li key={i}>{r}</li>)}
                                    </ul>
                                ) : (
                                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                                        {standardList.map((s) => <li key={s}>{STANDARD_LABEL[s] ?? s}</li>)}
                                    </ul>
                                )}
                            </SopSection>

                            <SopSection title="D. Definisi">
                                {defs.length > 0 ? <OutlineView nodes={defs} prefix="D" /> : <Empty />}
                                <SectionImagesView paths={document.section_images?.D} />
                            </SopSection>

                            <SopSection title="E. Penanggung Jawab">
                                {resps.length > 0 ? <OutlineView nodes={resps} prefix="E" /> : <Empty />}
                                <SectionImagesView paths={document.section_images?.E} />
                            </SopSection>

                            <SopSection title="F. Prosedur">
                                {steps.length > 0 ? <OutlineView nodes={steps} prefix="F" /> : <Empty />}

                                {(document.flowchart_path || (document.section_images?.F?.length ?? 0) > 0) && (
                                    <div className="mt-4">
                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Flow Chart</div>
                                        <div className="flex flex-wrap gap-2">
                                            {document.flowchart_path && (
                                                <img
                                                    src={`/storage/${document.flowchart_path}`}
                                                    alt="Flowchart"
                                                    className="max-h-96 rounded-md border bg-white object-contain"
                                                />
                                            )}
                                            {(document.section_images?.F ?? []).map((p, i) => (
                                                <img
                                                    key={i}
                                                    src={`/storage/${p}`}
                                                    alt="Flowchart"
                                                    className="max-h-96 rounded-md border bg-white object-contain"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </SopSection>

                            <SopSection title="G. Dokumen Terkait">
                                {related.length > 0 ? <OutlineView nodes={related} prefix="G" /> : <Empty />}
                                <SectionImagesView paths={document.section_images?.G} />
                            </SopSection>
                        </CardContent>
                    </Card>
                )}

                {/* Riwayat revisi — versi mobile */}
                <div className="md:hidden">
                    <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Riwayat Revisi ({document.versions.length})
                    </div>
                    <MobileList>
                        {document.versions.length === 0 && (
                            <MobileListEmpty message="Belum ada berkas diunggah — unggah lewat Edit." />
                        )}
                        {document.versions.map((v) => (
                            <MobileListCard
                                key={v.id}
                                code={`Rev ${v.revision} · ${fmtSize(v.file_size)}`}
                                title={v.file_name}
                                accent={v.is_current ? '#10b981' : undefined}
                                badges={
                                    v.is_current ? (
                                        <MobileBadge className="bg-emerald-500/15 text-emerald-700">current</MobileBadge>
                                    ) : undefined
                                }
                                meta={
                                    <>
                                        <MobileMeta icon={UserRound}>{v.author?.name ?? '—'}</MobileMeta>
                                        <MobileMeta icon={CalendarDays}>{mobileDate(v.created_at)}</MobileMeta>
                                    </>
                                }
                                footer={
                                    <div className="space-y-2">
                                        {v.change_summary && (
                                            <p className="text-[11px] leading-snug text-muted-foreground">
                                                {v.change_summary}
                                            </p>
                                        )}
                                        <Button asChild size="sm" variant="outline" className="h-9 w-full gap-1.5">
                                            <a href={`/storage/${v.file_path}`} target="_blank" rel="noreferrer">
                                                <Download className="size-3.5" /> Download
                                            </a>
                                        </Button>
                                    </div>
                                }
                            />
                        ))}
                    </MobileList>
                </div>

                <Card className="hidden md:block">
                    <CardHeader>
                        <CardTitle className="text-base">Revision History ({document.versions.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto p-0">
                        <table className="w-full text-sm">
                            <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Revision</th>
                                    <th className="px-4 py-3 text-left font-semibold">File</th>
                                    <th className="px-4 py-3 text-left font-semibold">Size</th>
                                    <th className="px-4 py-3 text-left font-semibold">Change Summary</th>
                                    <th className="px-4 py-3 text-left font-semibold">Author</th>
                                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {document.versions.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                            No file uploaded yet — upload via Edit.
                                        </td>
                                    </tr>
                                )}
                                {document.versions.map((v) => (
                                    <tr key={v.id} className="hover:bg-muted/40">
                                        <td className="px-4 py-3 font-mono">
                                            {v.revision}{' '}
                                            {v.is_current && (
                                                <Badge variant="secondary" className="ml-1 bg-emerald-500/15 text-[10px] text-emerald-700">
                                                    current
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">{v.file_name}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{fmtSize(v.file_size)}</td>
                                        <td className="px-4 py-3 text-xs">{v.change_summary ?? '—'}</td>
                                        <td className="px-4 py-3 text-xs">{v.author?.name ?? '—'}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{v.created_at}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Button asChild size="sm" variant="ghost" className="h-7 gap-1">
                                                <a href={`/storage/${v.file_path}`} target="_blank" rel="noreferrer">
                                                    <Download className="size-3.5" /> Download
                                                </a>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

function SopSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="overflow-hidden rounded-md border">
            <div className="border-b bg-muted/40 px-3 py-2 text-xs font-bold uppercase tracking-wider">{title}</div>
            <div className="p-3">{children}</div>
        </div>
    );
}

function SignatureCell({
    label,
    name,
    date,
    fallback,
    signaturePath,
    showSignature,
    isStamp,
}: {
    label: string;
    name: string | null | undefined;
    date: string | null;
    fallback?: string;
    signaturePath?: string | null;
    showSignature: boolean;
    isStamp?: boolean;
}) {
    return (
        <div className="rounded-md border p-3 text-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-2 flex h-12 items-center justify-center">
                {showSignature && signaturePath ? (
                    <img
                        src={`/storage/${signaturePath}`}
                        alt={`${name ?? ''} ${isStamp ? 'stamp' : 'signature'}`}
                        className="max-h-full max-w-full object-contain"
                    />
                ) : showSignature ? (
                    <span className="text-[10px] italic text-muted-foreground">{isStamp ? 'Stempel belum ada' : 'TTD belum ada'}</span>
                ) : (
                    <span className="text-[10px] italic text-amber-600">Menunggu approval</span>
                )}
            </div>
            <div className="mt-1 font-semibold">{name || fallback || '—'}</div>
            <div className="text-xs text-muted-foreground">{date ?? '—'}</div>
        </div>
    );
}

function Empty() {
    return <p className="text-xs italic text-muted-foreground">Belum diisi.</p>;
}

function SectionImagesView({ paths }: { paths?: string[] }) {
    if (!paths || paths.length === 0) return null;
    return (
        <div className="mt-3 flex flex-wrap gap-2">
            {paths.map((p, i) => (
                <img
                    key={i}
                    src={`/storage/${p}`}
                    alt="lampiran"
                    className="max-h-64 rounded-md border bg-white object-contain"
                />
            ))}
        </div>
    );
}

/** Renders a nested outline with auto numbering (e.g. D.1 → D.1.1 → D.1.1.1) and indentation. */
function OutlineView({ nodes, prefix }: { nodes: OutlineNode[]; prefix: string }) {
    return (
        <div className="space-y-1 text-sm">
            {nodes.map((n, i) => (
                <OutlineLine key={i} node={n} number={`${prefix}.${i + 1}`} depth={0} />
            ))}
        </div>
    );
}

function OutlineLine({ node, number, depth }: { node: OutlineNode; number: string; depth: number }) {
    return (
        <div>
            {/* Hanging indent: number in a fixed column so wrapped lines stay aligned under the text. */}
            <div className="flex gap-2" style={{ paddingLeft: depth * 18 }}>
                <span className="shrink-0 font-semibold">{number}</span>
                <span className="flex-1 text-justify">{node.text}</span>
            </div>
            {node.children.map((c, ci) => (
                <OutlineLine key={ci} node={c} number={`${number}.${ci + 1}`} depth={depth + 1} />
            ))}
        </div>
    );
}
