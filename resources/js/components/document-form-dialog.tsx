import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { OutlineEditor } from '@/components/sop/outline-editor';
import { SectionImages } from '@/components/sop/section-images';
import { RevisionHistoryEditor, RevisionRow } from '@/components/sop/revision-history-editor';
import { RevisionSelect } from '@/components/revision-select';
import { IsoClauses, normalizeIsoClauses, OutlineNode, pruneOutline, STD_LABEL, toOutline } from '@/lib/sop';
import { useForm } from '@inertiajs/react';
import { Loader2, Plus, Save, Trash2, Upload } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';

/** Sections that support image attachments (D–G). */
const IMG_SECTIONS = ['D', 'E', 'F', 'G'] as const;
type ImgSection = (typeof IMG_SECTIONS)[number];
type SectionMap<T> = Record<ImgSection, T>;

const emptySectionMap = <T,>(make: () => T): SectionMap<T> => ({
    D: make(),
    E: make(),
    F: make(),
    G: make(),
});

function buildSectionImages(value: unknown): SectionMap<string[]> {
    const src = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    const out = emptySectionMap<string[]>(() => []);
    for (const s of IMG_SECTIONS) {
        const arr = src[s];
        out[s] = Array.isArray(arr) ? arr.map(String) : [];
    }
    return out;
}

function buildRevisionRows(value: unknown): RevisionRow[] {
    if (!Array.isArray(value)) return [];
    return value.map((r) => {
        const o = (r ?? {}) as Record<string, unknown>;
        return {
            revision: String(o.revision ?? ''),
            date: String(o.date ?? ''),
            summary: String(o.summary ?? ''),
            page: String(o.page ?? ''),
            mr: String(o.mr ?? ''),
        };
    });
}

export interface DocumentRecord {
    id?: number;
    code?: string;
    title?: string;
    type?: string;
    standard?: string;
    standards?: string[] | null;
    department_id?: number | null;
    description?: string | null;
    effective_date?: string | null;
    next_review_date?: string | null;
    current_revision?: string;
    purpose?: string | null;
    scope?: string | null;
    references_list?: string[] | null;
    iso_clauses?: Record<string, string[]> | null;
    definitions?: unknown;
    responsibilities?: unknown;
    procedure_steps?: unknown;
    related_documents?: unknown;
    section_images?: Record<string, string[]> | null;
    revision_history?: unknown;
    prepared_by_user_id?: number | null;
    prepared_by_name?: string | null;
    prepared_by_date?: string | null;
    reviewed_by_user_id?: number | null;
    reviewed_by_name?: string | null;
    reviewed_by_date?: string | null;
    reviewed_by_2_user_id?: number | null;
    reviewed_by_2_name?: string | null;
    reviewed_by_2_date?: string | null;
    approved_by_user_id?: number | null;
    approved_by_name?: string | null;
    approved_by_date?: string | null;
    document_control_user_id?: number | null;
    flowchart_path?: string | null;
}

interface Department { id: number; name: string }
export interface ApproverUser {
    id: number;
    name: string;
    email?: string | null;
    position: string | null;
    signature_url: string | null;
    stamp_url?: string | null;
    roles?: string[];
}

interface Props {
    trigger?: ReactNode;
    document?: DocumentRecord;
    departments: Department[];
    users: ApproverUser[];
    /** Optional controlled open state (e.g. opened from a dropdown menu instead of a trigger). */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const TYPES = [
    { value: 'policy', label: 'Kebijakan Perusahaan' },
    { value: 'anti_bribery', label: 'Kebijakan Anti Suap' },
    { value: 'sop', label: 'Prosedur' },
    { value: 'work_instruction', label: 'Instruksi Kerja' },
    { value: 'form', label: 'Form' },
    { value: 'record', label: 'Record (.pdf)' },
    { value: 'other', label: 'Other' },
];

const STANDARDS = [
    { value: 'iso_9001',  label: 'ISO 9001 : 2015',  short: 'Quality' },
    { value: 'iso_14001', label: 'ISO 14001 : 2015', short: 'Environment' },
    { value: 'iso_45001', label: 'ISO 45001 : 2018', short: 'OH&S' },
    { value: 'iatf',      label: 'IATF 16949 : 2016', short: 'Automotive' },
    { value: 'internal',  label: 'Internal',         short: 'Internal' },
];

type FormShape = {
    code: string;
    title: string;
    type: string;
    standards: string[];
    department_id: string;
    description: string;
    effective_date: string;
    next_review_date: string;
    current_revision: string;
    change_summary: string;
    file: File | null;
    purpose: string;
    scope: string;
    references_list: string[];
    iso_clauses: IsoClauses;
    definitions: OutlineNode[];
    responsibilities: OutlineNode[];
    procedure_steps: OutlineNode[];
    related_documents: OutlineNode[];
    section_images: SectionMap<string[]>;
    new_images: SectionMap<File[]>;
    revision_history: RevisionRow[];
    prepared_by_user_id: string;
    prepared_by_name: string;
    prepared_by_date: string;
    reviewed_by_user_id: string;
    reviewed_by_name: string;
    reviewed_by_date: string;
    reviewed_by_2_user_id: string;
    reviewed_by_2_name: string;
    reviewed_by_2_date: string;
    approved_by_user_id: string;
    approved_by_name: string;
    approved_by_date: string;
    document_control_user_id: string;
    flowchart: File | null;
};

function buildInitialClauses(value: unknown, standards: string[]): IsoClauses {
    const base = normalizeIsoClauses(value);
    for (const s of standards) if (!base[s]) base[s] = [];
    return base;
}

export function DocumentFormDialog({ trigger, document, departments, users, open: controlledOpen, onOpenChange }: Props) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;
    const isEdit = !!document?.id;

    const initialStandards =
        (document?.standards && document.standards.length > 0)
            ? document.standards
            : document?.standard
            ? [document.standard]
            : ['iso_9001'];

    const { data, setData, post, processing, errors, reset, transform, progress } = useForm<FormShape>({
        code: document?.code ?? '',
        title: document?.title ?? '',
        type: document?.type ?? 'sop',
        standards: initialStandards,
        department_id: document?.department_id ? String(document.department_id) : '',
        description: document?.description ?? '',
        effective_date: document?.effective_date ?? '',
        next_review_date: document?.next_review_date ?? '',
        current_revision: document?.current_revision ?? '00',
        change_summary: '',
        file: null,
        purpose: document?.purpose ?? '',
        scope: document?.scope ?? '',
        references_list: document?.references_list ?? [],
        iso_clauses: buildInitialClauses(document?.iso_clauses, initialStandards),
        definitions: toOutline(document?.definitions),
        responsibilities: toOutline(document?.responsibilities),
        procedure_steps: toOutline(document?.procedure_steps),
        related_documents: toOutline(document?.related_documents),
        section_images: buildSectionImages(document?.section_images),
        new_images: emptySectionMap<File[]>(() => []),
        revision_history: buildRevisionRows(document?.revision_history),
        prepared_by_user_id: document?.prepared_by_user_id ? String(document.prepared_by_user_id) : '',
        prepared_by_name: document?.prepared_by_name ?? '',
        prepared_by_date: document?.prepared_by_date ?? '',
        reviewed_by_user_id: document?.reviewed_by_user_id ? String(document.reviewed_by_user_id) : '',
        reviewed_by_name: document?.reviewed_by_name ?? '',
        reviewed_by_date: document?.reviewed_by_date ?? '',
        reviewed_by_2_user_id: document?.reviewed_by_2_user_id ? String(document.reviewed_by_2_user_id) : '',
        reviewed_by_2_name: document?.reviewed_by_2_name ?? '',
        reviewed_by_2_date: document?.reviewed_by_2_date ?? '',
        approved_by_user_id: document?.approved_by_user_id ? String(document.approved_by_user_id) : '',
        approved_by_name: document?.approved_by_name ?? '',
        approved_by_date: document?.approved_by_date ?? '',
        document_control_user_id: document?.document_control_user_id ? String(document.document_control_user_id) : '',
        flowchart: null,
    });

    useEffect(() => {
        if (!open) reset();
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    transform((d) => ({
        ...d,
        department_id: d.department_id === '' ? null : Number(d.department_id),
        prepared_by_user_id: d.prepared_by_user_id === '' ? null : Number(d.prepared_by_user_id),
        reviewed_by_user_id: d.reviewed_by_user_id === '' ? null : Number(d.reviewed_by_user_id),
        reviewed_by_2_user_id: d.reviewed_by_2_user_id === '' ? null : Number(d.reviewed_by_2_user_id),
        approved_by_user_id: d.approved_by_user_id === '' ? null : Number(d.approved_by_user_id),
        document_control_user_id: d.document_control_user_id === '' ? null : Number(d.document_control_user_id),
        // Clean SOP body before submit — drop empty outline rows, keep clauses only
        // for the standards still selected and strip blank clause inputs.
        definitions: pruneOutline(d.definitions),
        responsibilities: pruneOutline(d.responsibilities),
        procedure_steps: pruneOutline(d.procedure_steps),
        related_documents: pruneOutline(d.related_documents),
        iso_clauses: Object.fromEntries(
            d.standards.map((s) => [s, (d.iso_clauses[s] ?? []).map((c) => c.trim()).filter(Boolean)]),
        ),
        // Drop fully-empty revision rows before submit.
        revision_history: d.revision_history.filter((r) =>
            [r.revision, r.date, r.summary, r.page, r.mr].some((v) => v.trim() !== ''),
        ),
        // Method spoofing for multipart edit — Inertia sends POST, Laravel reads _method.
        ...(isEdit ? { _method: 'put' } : {}),
    }));

    const showSop = data.type === 'sop';

    const toggleStandard = (val: string) => {
        const has = data.standards.includes(val);
        setData('standards', has ? data.standards.filter((s) => s !== val) : [...data.standards, val]);
        if (!has && !data.iso_clauses[val]) {
            setData('iso_clauses', { ...data.iso_clauses, [val]: [] });
        }
    };

    // --- ISO clause helpers (grouped per standard → renders into Point C) ---
    const setClauses = (std: string, clauses: string[]) =>
        setData('iso_clauses', { ...data.iso_clauses, [std]: clauses });
    const addClause = (std: string) => setClauses(std, [...(data.iso_clauses[std] ?? []), '']);
    const setClause = (std: string, i: number, v: string) =>
        setClauses(std, (data.iso_clauses[std] ?? []).map((c, idx) => (idx === i ? v : c)));
    const removeClause = (std: string, i: number) =>
        setClauses(std, (data.iso_clauses[std] ?? []).filter((_, idx) => idx !== i));

    // --- Per-section image helpers (D–G) ---
    const setSecExisting = (sec: ImgSection, paths: string[]) =>
        setData('section_images', { ...data.section_images, [sec]: paths });
    const setSecNew = (sec: ImgSection, files: File[]) =>
        setData('new_images', { ...data.new_images, [sec]: files });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const url = isEdit ? `/documents/${document!.id}` : '/documents';
        post(url, {
            forceFormData: true,
            onSuccess: () => setOpen(false),
            preserveScroll: true,
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger ?? null}
            <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Document' : 'New Document'}</DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Update metadata. Uploading a new file will bump the revision.'
                            : 'Create a new controlled document. For Prosedur type, fill the digital procedure body to generate the PDF.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="grid gap-5">
                    {/* ============== Basic metadata ============== */}
                    <section className="grid gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="code">Document Code *</Label>
                                <Input
                                    id="code"
                                    placeholder="e.g. BTI PR-IT-002"
                                    value={data.code}
                                    onChange={(e) => setData('code', e.target.value)}
                                    disabled={isEdit}
                                    className="font-mono"
                                />
                                {errors.code && <p className="text-xs text-red-600">{errors.code}</p>}
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="current_revision">Revision *</Label>
                                <RevisionSelect
                                    value={data.current_revision}
                                    onChange={(v) => setData('current_revision', v)}
                                />
                                {errors.current_revision && <p className="text-xs text-red-600">{errors.current_revision}</p>}
                            </div>
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g. Backup Data"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                            />
                            {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label>Type *</Label>
                                <Select value={data.type} onValueChange={(v) => setData('type', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {TYPES.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label>Department</Label>
                                <Select
                                    value={data.department_id}
                                    onValueChange={(v) => setData('department_id', v === '_none' ? '' : v)}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">— None —</SelectItem>
                                        {departments.map((d) => (
                                            <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Multi ISO standards */}
                        <div className="grid gap-2 rounded-md border bg-muted/30 p-3">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                ISO Standards * (pilih satu atau lebih)
                            </Label>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {STANDARDS.map((s) => {
                                    const checked = data.standards.includes(s.value);
                                    return (
                                        <label
                                            key={s.value}
                                            className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm transition-colors ${
                                                checked ? 'border-[#b91c1c] bg-red-50 dark:bg-red-950/20' : 'hover:bg-muted/50'
                                            }`}
                                        >
                                            <Checkbox
                                                checked={checked}
                                                onCheckedChange={() => toggleStandard(s.value)}
                                                className="mt-0.5"
                                            />
                                            <div>
                                                <div className="font-semibold">{s.label}</div>
                                                <div className="text-[11px] text-muted-foreground">{s.short}</div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                            {errors.standards && <p className="text-xs text-red-600">{errors.standards as string}</p>}

                            {/* Klausul per standar — otomatis tampil di Point C (Acuan) */}
                            {showSop && data.standards.length > 0 && (
                                <div className="mt-1 grid gap-2 border-t pt-3">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Klausul per Standar (otomatis ter-report ke Point C — Acuan)
                                    </Label>
                                    {data.standards.map((std) => {
                                        const clauses = data.iso_clauses[std] ?? [];
                                        return (
                                            <div key={std} className="rounded-md border bg-background p-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold">{STD_LABEL[std] ?? std}</span>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 gap-1"
                                                        onClick={() => addClause(std)}
                                                    >
                                                        <Plus className="size-3.5" /> Klausul
                                                    </Button>
                                                </div>
                                                {clauses.length === 0 ? (
                                                    <p className="mt-1 text-[11px] italic text-muted-foreground">Belum ada klausul.</p>
                                                ) : (
                                                    <div className="mt-1.5 grid gap-1.5">
                                                        {clauses.map((c, i) => (
                                                            <div key={i} className="flex items-center gap-2">
                                                                <Input
                                                                    className="h-8"
                                                                    placeholder="mis. 7.5.3 Pengendalian Informasi Terdokumentasi"
                                                                    value={c}
                                                                    onChange={(e) => setClause(std, i, e.target.value)}
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                                                                    onClick={() => removeClause(std, i)}
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="effective_date">Effective Date</Label>
                                <Input
                                    id="effective_date"
                                    type="date"
                                    value={data.effective_date ?? ''}
                                    onChange={(e) => setData('effective_date', e.target.value)}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="next_review_date">Next Review</Label>
                                <Input
                                    id="next_review_date"
                                    type="date"
                                    value={data.next_review_date ?? ''}
                                    onChange={(e) => setData('next_review_date', e.target.value)}
                                />
                                {errors.next_review_date && (
                                    <p className="text-xs text-red-600">{errors.next_review_date}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Scope, applicability, summary…"
                                rows={2}
                                value={data.description ?? ''}
                                onChange={(e) => setData('description', e.target.value)}
                            />
                        </div>
                    </section>

                    {/* ============== SOP digital procedure body ============== */}
                    {showSop && (
                        <section className="grid gap-4 rounded-lg border-2 border-dashed border-[#b91c1c]/40 bg-red-50/30 p-4 dark:bg-red-950/10">
                            <div>
                                <h3 className="text-sm font-bold text-[#b91c1c]">DIGITAL PROSEDUR</h3>
                                <p className="text-xs text-muted-foreground">
                                    Mengikuti layout BTI PR-IT (Tujuan · Ruang Lingkup · Acuan · Definisi · Penanggung Jawab · Prosedur · Dokumen Terkait).
                                </p>
                            </div>

                            {/* Approval / Signature block */}
                            <div className="grid gap-3">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Approval Flow (signatories)
                                </Label>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    <ApproverPicker
                                        label="Dibuat Oleh"
                                        users={users}
                                        userId={data.prepared_by_user_id}
                                        onUser={(uid, uname) => {
                                            setData('prepared_by_user_id', uid);
                                            setData('prepared_by_name', uname);
                                        }}
                                        date={data.prepared_by_date}
                                        onDate={(v) => setData('prepared_by_date', v)}
                                    />
                                    <ApproverPicker
                                        label="Ditinjau Oleh (1)"
                                        users={users}
                                        userId={data.reviewed_by_user_id}
                                        onUser={(uid, uname) => {
                                            setData('reviewed_by_user_id', uid);
                                            setData('reviewed_by_name', uname);
                                        }}
                                        date={data.reviewed_by_date}
                                        onDate={(v) => setData('reviewed_by_date', v)}
                                    />
                                    <ApproverPicker
                                        label="Ditinjau Oleh (2) — opsional"
                                        users={users}
                                        userId={data.reviewed_by_2_user_id}
                                        onUser={(uid, uname) => {
                                            setData('reviewed_by_2_user_id', uid);
                                            setData('reviewed_by_2_name', uname);
                                        }}
                                        date={data.reviewed_by_2_date}
                                        onDate={(v) => setData('reviewed_by_2_date', v)}
                                    />
                                    <ApproverPicker
                                        label="Disetujui Oleh"
                                        users={users}
                                        userId={data.approved_by_user_id}
                                        onUser={(uid, uname) => {
                                            setData('approved_by_user_id', uid);
                                            setData('approved_by_name', uname);
                                        }}
                                        date={data.approved_by_date}
                                        onDate={(v) => setData('approved_by_date', v)}
                                    />
                                    <ApproverPicker
                                        label="Document Control"
                                        users={users.filter((u) => u.roles?.includes('document_control'))}
                                        userId={data.document_control_user_id}
                                        onUser={(uid) => setData('document_control_user_id', uid)}
                                        emptyHint="Hanya user dengan role document_control"
                                    />
                                </div>
                            </div>

                            {/* Riwayat Revisi manual — tampil di halaman 1 PDF */}
                            <RevisionHistoryEditor
                                rows={data.revision_history}
                                onChange={(r) => setData('revision_history', r)}
                            />

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label>A. Tujuan</Label>
                                    <Textarea
                                        rows={3}
                                        placeholder="Sebagai acuan penerapan langkah-langkah untuk…"
                                        value={data.purpose}
                                        onChange={(e) => setData('purpose', e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label>B. Ruang Lingkup</Label>
                                    <Textarea
                                        rows={3}
                                        placeholder="Prosedur ini mencakup kegiatan…"
                                        value={data.scope}
                                        onChange={(e) => setData('scope', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* C. Acuan is generated from the ISO clauses entered above. */}
                            <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">C. Acuan</span> terisi otomatis dari{' '}
                                <span className="font-semibold">Klausul per Standar</span> di atas, dikelompokkan per standar ISO.
                            </div>

                            {/* D. Definisi — sub-bab bertingkat */}
                            <div className="grid gap-0">
                                <OutlineEditor
                                    label="D. Definisi"
                                    prefix="D"
                                    nodes={data.definitions}
                                    onChange={(n) => setData('definitions', n)}
                                    placeholder="Istilah — penjelasan"
                                />
                                <SectionImages
                                    section="D"
                                    existing={data.section_images.D}
                                    newFiles={data.new_images.D}
                                    onExistingChange={(p) => setSecExisting('D', p)}
                                    onNewChange={(f) => setSecNew('D', f)}
                                />
                            </div>

                            {/* E. Penanggung Jawab — sub-bab bertingkat */}
                            <div className="grid gap-0">
                                <OutlineEditor
                                    label="E. Penanggung Jawab"
                                    prefix="E"
                                    nodes={data.responsibilities}
                                    onChange={(n) => setData('responsibilities', n)}
                                    placeholder="Jabatan — tanggung jawab"
                                />
                                <SectionImages
                                    section="E"
                                    existing={data.section_images.E}
                                    newFiles={data.new_images.E}
                                    onExistingChange={(p) => setSecExisting('E', p)}
                                    onNewChange={(f) => setSecNew('E', f)}
                                />
                            </div>

                            {/* F. Prosedur — sub-bab bertingkat + flowchart (boleh lebih dari satu) */}
                            <div className="grid gap-0">
                                <OutlineEditor
                                    label="F. Prosedur (langkah-langkah)"
                                    prefix="F"
                                    nodes={data.procedure_steps}
                                    onChange={(n) => setData('procedure_steps', n)}
                                    placeholder="Langkah / aktivitas"
                                />
                                {document?.flowchart_path && (
                                    <div className="mt-2 flex items-center gap-2 rounded-md border border-dashed bg-muted/20 p-2 text-[11px] text-muted-foreground">
                                        <img
                                            src={`/storage/${document.flowchart_path}`}
                                            alt="Flowchart lama"
                                            className="size-12 rounded border bg-white object-contain"
                                        />
                                        Flowchart lama (legacy) tetap tampil di PDF. Tambahkan flowchart baru di bawah.
                                    </div>
                                )}
                                <SectionImages
                                    section="F"
                                    label="Flow Chart (boleh lebih dari satu)"
                                    existing={data.section_images.F}
                                    newFiles={data.new_images.F}
                                    onExistingChange={(p) => setSecExisting('F', p)}
                                    onNewChange={(f) => setSecNew('F', f)}
                                />
                            </div>

                            {/* G. Dokumen Terkait — sub-bab G.1, G.2 … bertingkat */}
                            <div className="grid gap-0">
                                <OutlineEditor
                                    label="G. Dokumen Terkait"
                                    prefix="G"
                                    nodes={data.related_documents}
                                    onChange={(n) => setData('related_documents', n)}
                                    placeholder="Nama / nomor dokumen terkait"
                                />
                                <SectionImages
                                    section="G"
                                    existing={data.section_images.G}
                                    newFiles={data.new_images.G}
                                    onExistingChange={(p) => setSecExisting('G', p)}
                                    onNewChange={(f) => setSecNew('G', f)}
                                />
                            </div>
                        </section>
                    )}

                    {/* File upload */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="file">
                            {isEdit ? 'Replace file (optional — bumps revision)' : 'Attached file (optional)'}
                        </Label>
                        <div className="flex items-center gap-2">
                            <label
                                htmlFor="file"
                                className="flex h-9 flex-1 cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm hover:bg-muted/50"
                            >
                                <Upload className="size-4 text-muted-foreground" />
                                <span className="truncate text-muted-foreground">
                                    {data.file ? data.file.name : 'Choose PDF, DOCX, XLSX…'}
                                </span>
                            </label>
                            <Input
                                id="file"
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={(e) => setData('file', e.target.files?.[0] ?? null)}
                            />
                        </div>
                        {progress && (
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full bg-[#dc2626] transition-all"
                                    style={{ width: `${progress.percentage}%` }}
                                />
                            </div>
                        )}
                        {errors.file && <p className="text-xs text-red-600">{errors.file}</p>}
                    </div>

                    {isEdit && data.file && (
                        <div className="grid gap-1.5">
                            <Label htmlFor="change_summary">Change summary</Label>
                            <Input
                                id="change_summary"
                                placeholder="What changed in this revision?"
                                value={data.change_summary}
                                onChange={(e) => setData('change_summary', e.target.value)}
                            />
                        </div>
                    )}

                    <DialogFooter className="sticky bottom-0 -mx-6 -mb-6 mt-2 border-t bg-background/95 px-6 py-3 backdrop-blur">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing} className="gap-1.5 bg-[#b91c1c] hover:bg-[#991b1b]">
                            {processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            {isEdit ? 'Save changes' : 'Create document'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ApproverPicker({
    label,
    users,
    userId,
    onUser,
    date,
    onDate,
    emptyHint,
}: {
    label: string;
    users: ApproverUser[];
    userId: string;
    onUser: (id: string, name: string) => void;
    date?: string;
    onDate?: (v: string) => void;
    emptyHint?: string;
}) {
    const selected = users.find((u) => String(u.id) === userId);
    const isStampPicker = !onDate;
    return (
        <div className="grid gap-2 rounded-md border bg-background p-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
            <Select
                value={userId === '' ? '_none' : userId}
                onValueChange={(v) => {
                    if (v === '_none') {
                        onUser('', '');
                    } else {
                        const u = users.find((x) => String(x.id) === v);
                        onUser(v, u?.name ?? '');
                    }
                }}
            >
                <SelectTrigger><SelectValue placeholder="Pilih user…" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="_none">— Belum dipilih —</SelectItem>
                    {users.length === 0 && (
                        <div className="px-2 py-1.5 text-[11px] italic text-muted-foreground">
                            {emptyHint ?? 'Tidak ada user'}
                        </div>
                    )}
                    {users.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                            {u.name}{u.position ? ` · ${u.position}` : ''}
                            {(isStampPicker ? u.stamp_url : u.signature_url) ? ' ✓' : ''}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {onDate && (
                <Input type="date" value={date ?? ''} onChange={(e) => onDate(e.target.value)} />
            )}
            {selected && (
                <>
                    {selected.email && (
                        <p className="truncate text-[10px] text-muted-foreground">{selected.email}</p>
                    )}
                    <div className="mt-1 flex h-12 items-center justify-center rounded border bg-muted/40">
                        {(isStampPicker ? selected.stamp_url : selected.signature_url) ? (
                            <img
                                src={isStampPicker ? selected.stamp_url! : selected.signature_url!}
                                alt={`${selected.name} ${isStampPicker ? 'stamp' : 'signature'}`}
                                className="max-h-full max-w-full object-contain"
                            />
                        ) : (
                            <span className="text-[10px] italic text-muted-foreground">
                                {isStampPicker ? 'Belum upload stempel' : 'Belum upload TTD'}
                            </span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
