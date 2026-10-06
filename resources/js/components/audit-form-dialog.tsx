import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { Info, Loader2, Plus, Send, Trash2, X } from 'lucide-react';
import { FormEvent } from 'react';

interface Department { id: number; name: string }
interface UserOpt    { id: number; name: string; department_id: number | null }

interface ScheduleEdit {
    id: number;
    period_label: string | null;
    standards: string[] | null;
    type: string;
    lead_auditor_id: number | null;
    scope: string | null;
    objectives: string | null;
    opening_at: string | null;
    closing_at: string | null;
    opening_location: string | null;
    closing_location: string | null;
    audit_categories: string[] | null;
    rows: BagianRow[];
}

const CATEGORY_OPTIONS = [
    { value: 'sistem', label: 'Sistem' },
    { value: 'proses', label: 'Proses' },
    { value: 'produk', label: 'Produk' },
];

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    departments: Department[];
    users: UserOpt[];
    /** When provided, the dialog edits an existing schedule (PUT) instead of creating one. */
    schedule?: ScheduleEdit;
}

const STANDARD_OPTIONS = [
    { value: 'iso_9001', label: 'ISO 9001:2015' },
    { value: 'iso_14001', label: 'ISO 14001:2015' },
    { value: 'iso_45001', label: 'ISO 45001:2018' },
    { value: 'iatf', label: 'IATF 16949' },
    { value: 'internal', label: 'Internal' },
];

type ProcessRow = { proses: string; related_documents: string[] };
type BagianRow = {
    department_id: number | null;
    location: string;
    planned_date: string;
    jam_pelaksanaan: string;
    team: number[];
    auditees: number[];
    processes: ProcessRow[];
};

const emptyProcess = (): ProcessRow => ({ proses: '', related_documents: [''] });
const emptyRow = (): BagianRow => ({
    department_id: null,
    location: '',
    planned_date: new Date().toISOString().slice(0, 10),
    jam_pelaksanaan: '',
    team: [],
    auditees: [],
    processes: [emptyProcess()],
});

export function AuditFormDialog({ open, onOpenChange, departments, users, schedule }: Props) {
    const isEdit = !!schedule;
    const form = useForm<{
        period_label: string;
        standards: string[];
        type: string;
        lead_auditor_id: number | null;
        scope: string;
        objectives: string;
        opening_at: string;
        closing_at: string;
        opening_location: string;
        closing_location: string;
        audit_categories: string[];
        rows: BagianRow[];
    }>({
        period_label: schedule?.period_label ?? '',
        standards: (schedule?.standards && schedule.standards.length > 0) ? schedule.standards : ['iso_9001'],
        type: schedule?.type ?? 'internal',
        lead_auditor_id: schedule?.lead_auditor_id ?? null,
        scope: schedule?.scope ?? '',
        objectives: schedule?.objectives ?? '',
        opening_at: schedule?.opening_at ? schedule.opening_at.slice(0, 16) : '',
        closing_at: schedule?.closing_at ? schedule.closing_at.slice(0, 16) : '',
        opening_location: schedule?.opening_location ?? '',
        closing_location: schedule?.closing_location ?? '',
        audit_categories: (schedule?.audit_categories && schedule.audit_categories.length > 0)
            ? schedule.audit_categories
            : ['sistem', 'proses', 'produk'],
        rows: (schedule?.rows && schedule.rows.length > 0) ? schedule.rows : [emptyRow()],
    });

    const toggleStandard = (val: string) => {
        const arr = form.data.standards;
        form.setData('standards', arr.includes(val) ? arr.filter((s) => s !== val) : [...arr, val]);
    };

    const toggleCategory = (val: string) => {
        const arr = form.data.audit_categories;
        form.setData('audit_categories', arr.includes(val) ? arr.filter((c) => c !== val) : [...arr, val]);
    };

    const rows = form.data.rows;
    const setRows = (next: BagianRow[]) => form.setData('rows', next);
    const patchRow = (i: number, patch: Partial<BagianRow>) =>
        setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    const addRow = () => setRows([...rows, emptyRow()]);
    const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

    const toggleRowArr = (i: number, key: 'team' | 'auditees', id: number) => {
        const arr = rows[i][key];
        patchRow(i, { [key]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id] } as Partial<BagianRow>);
    };

    const setProcess = (ri: number, pi: number, patch: Partial<ProcessRow>) =>
        patchRow(ri, { processes: rows[ri].processes.map((p, idx) => (idx === pi ? { ...p, ...patch } : p)) });
    const addProcess = (ri: number) => patchRow(ri, { processes: [...rows[ri].processes, emptyProcess()] });
    const removeProcess = (ri: number, pi: number) => {
        if (rows[ri].processes.length <= 1) return; // keep at least one process
        patchRow(ri, { processes: rows[ri].processes.filter((_, idx) => idx !== pi) });
    };

    // Related documents per process (1 proses → multi related document).
    const setRelDoc = (ri: number, pi: number, di: number, val: string) =>
        setProcess(ri, pi, { related_documents: rows[ri].processes[pi].related_documents.map((d, idx) => (idx === di ? val : d)) });
    const addRelDoc = (ri: number, pi: number) =>
        setProcess(ri, pi, { related_documents: [...rows[ri].processes[pi].related_documents, ''] });
    const removeRelDoc = (ri: number, pi: number, di: number) =>
        setProcess(ri, pi, { related_documents: rows[ri].processes[pi].related_documents.filter((_, idx) => idx !== di) });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                if (!isEdit) form.reset();
            },
        };
        if (isEdit) {
            form.put(`/audit-schedules/${schedule!.id}`, opts);
        } else {
            form.post('/audits', opts);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Jadwal Audit Internal' : 'Buat Jadwal Audit Internal (FM-BDK-007)'}</DialogTitle>
                    <DialogDescription>
                        Satu jadwal, banyak bagian. Lead auditor &amp; periode cukup diisi sekali; tiap bagian menjadi 1 audit.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    {Object.keys(form.errors).length > 0 && (
                        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700">
                            Semua kolom wajib diisi. Lengkapi kolom yang ditandai sebelum submit.
                        </div>
                    )}
                    {/* ===== Header bersama (1x isi) ===== */}
                    <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
                        <div className="col-span-2">
                            <Label>Periode *</Label>
                            <Input
                                required
                                value={form.data.period_label}
                                onChange={(e) => form.setData('period_label', e.target.value)}
                                placeholder="SEMESTER 2 Tahun 2025 (15 - 30 Januari 2026)"
                            />
                        </div>
                        <div className="col-span-2">
                            <Label>Standar * (boleh lebih dari satu)</Label>
                            <div className="mt-1 flex flex-wrap gap-2">
                                {STANDARD_OPTIONS.map((s) => {
                                    const on = form.data.standards.includes(s.value);
                                    return (
                                        <label
                                            key={s.value}
                                            className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${
                                                on ? 'border-[#b91c1c] bg-red-50 text-[#b91c1c]' : 'hover:bg-muted/50'
                                            }`}
                                        >
                                            <input type="checkbox" checked={on} onChange={() => toggleStandard(s.value)} />
                                            {s.label}
                                        </label>
                                    );
                                })}
                            </div>
                            {form.errors.standards && <p className="text-xs text-red-600 mt-1">{form.errors.standards}</p>}
                        </div>
                        <div className="col-span-2">
                            <Label>Tipe</Label>
                            <select
                                value={form.data.type}
                                onChange={(e) => form.setData('type', e.target.value)}
                                className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="internal">Internal</option>
                                <option value="external">External</option>
                                <option value="surveillance">Surveillance</option>
                                <option value="recertification">Recertification</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <Label>Lead Auditor * (1x untuk seluruh jadwal)</Label>
                            <select
                                value={form.data.lead_auditor_id ?? ''}
                                onChange={(e) => form.setData('lead_auditor_id', e.target.value ? Number(e.target.value) : null)}
                                className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                                required
                            >
                                <option value="">— pilih —</option>
                                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            {form.errors.lead_auditor_id && <p className="text-xs text-red-600 mt-1">{form.errors.lead_auditor_id}</p>}
                        </div>
                        <div>
                            <Label>Scope / Klausul *</Label>
                            <Textarea required rows={2} value={form.data.scope} onChange={(e) => form.setData('scope', e.target.value)} placeholder="Klausul 7.1, 8.5, 9.1" />
                        </div>
                        <div>
                            <Label>Objektif *</Label>
                            <Textarea required rows={2} value={form.data.objectives} onChange={(e) => form.setData('objectives', e.target.value)} />
                        </div>
                        <div>
                            <Label>Jadwal Opening</Label>
                            <Input
                                type="datetime-local"
                                value={form.data.opening_at}
                                onChange={(e) => form.setData('opening_at', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Lokasi Opening</Label>
                            <Input
                                value={form.data.opening_location}
                                onChange={(e) => form.setData('opening_location', e.target.value)}
                                placeholder="mis. Ruang Meeting Bima 2"
                            />
                        </div>
                        <div>
                            <Label>Jadwal Closing</Label>
                            <Input
                                type="datetime-local"
                                value={form.data.closing_at}
                                onChange={(e) => form.setData('closing_at', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Lokasi Closing</Label>
                            <Input
                                value={form.data.closing_location}
                                onChange={(e) => form.setData('closing_location', e.target.value)}
                                placeholder="mis. Ruang Meeting Bima 2"
                            />
                        </div>
                        <div className="col-span-2">
                            <Label>Jenis Audit * (muncul di subjudul PDF)</Label>
                            <div className="mt-1 flex flex-wrap gap-2">
                                {CATEGORY_OPTIONS.map((c) => {
                                    const on = form.data.audit_categories.includes(c.value);
                                    return (
                                        <label
                                            key={c.value}
                                            className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${
                                                on ? 'border-[#b91c1c] bg-red-50 text-[#b91c1c]' : 'hover:bg-muted/50'
                                            }`}
                                        >
                                            <input type="checkbox" checked={on} onChange={() => toggleCategory(c.value)} />
                                            {c.label}
                                        </label>
                                    );
                                })}
                            </div>
                            {form.errors.audit_categories && <p className="text-xs text-red-600 mt-1">{form.errors.audit_categories}</p>}
                        </div>
                    </div>

                    {/* ===== Baris per bagian ===== */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">Bagian &amp; Auditee ({rows.length})</Label>
                            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={addRow}>
                                <Plus className="size-3.5" /> Tambah Bagian
                            </Button>
                        </div>

                        {rows.map((row, ri) => (
                            <div key={ri} className="rounded-lg border p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs font-bold text-muted-foreground">BAGIAN #{ri + 1}</span>
                                    {rows.length > 1 && (
                                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => removeRow(ri)}>
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                    <div className="lg:col-span-2">
                                        <Label className="text-xs">Bagian / Departemen *</Label>
                                        <select
                                            value={row.department_id ?? ''}
                                            onChange={(e) => patchRow(ri, { department_id: e.target.value ? Number(e.target.value) : null })}
                                            className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                                            required
                                        >
                                            <option value="">— pilih —</option>
                                            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Tanggal *</Label>
                                        <Input type="date" value={row.planned_date} onChange={(e) => patchRow(ri, { planned_date: e.target.value })} required />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Jam Pelaksanaan *</Label>
                                        <Input required value={row.jam_pelaksanaan} onChange={(e) => patchRow(ri, { jam_pelaksanaan: e.target.value })} placeholder="08.30 - 12.00" />
                                    </div>
                                    <div className="lg:col-span-2">
                                        <Label className="text-xs">Lokasi Audit *</Label>
                                        <Input required value={row.location} onChange={(e) => patchRow(ri, { location: e.target.value })} placeholder="Ruang Meeting Bima 2" />
                                    </div>
                                </div>

                                {/* Proses + Related Document */}
                                <div className="mt-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs">Proses &amp; Related Document *</Label>
                                        <Button type="button" size="sm" variant="ghost" className="h-6 gap-1 text-[11px]" onClick={() => addProcess(ri)}>
                                            <Plus className="size-3" /> Proses
                                        </Button>
                                    </div>
                                    <div className="mt-1 space-y-2">
                                        {row.processes.map((p, pi) => (
                                            <div key={pi} className="grid grid-cols-1 gap-2 rounded border bg-muted/20 p-2 sm:grid-cols-[1fr_1.5fr_auto]">
                                                <Input
                                                    className="h-8"
                                                    required
                                                    value={p.proses}
                                                    onChange={(e) => setProcess(ri, pi, { proses: e.target.value })}
                                                    placeholder="Proses (mis. Customer Satisfaction)"
                                                />
                                                {/* Related documents — boleh lebih dari satu per proses */}
                                                <div className="space-y-1.5">
                                                    {p.related_documents.map((doc, di) => (
                                                        <div key={di} className="flex items-center gap-1.5">
                                                            <Input
                                                                className="h-8"
                                                                required
                                                                value={doc}
                                                                onChange={(e) => setRelDoc(ri, pi, di, e.target.value)}
                                                                placeholder={`Related document #${di + 1}`}
                                                            />
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-7 shrink-0 text-red-600"
                                                                title="Hapus dokumen"
                                                                onClick={() => removeRelDoc(ri, pi, di)}
                                                                disabled={p.related_documents.length <= 1}
                                                            >
                                                                <X className="size-3.5" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 gap-1 text-[11px]"
                                                        onClick={() => addRelDoc(ri, pi)}
                                                    >
                                                        <Plus className="size-3" /> Related document
                                                    </Button>
                                                </div>
                                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => removeProcess(ri, pi)} title="Hapus proses">
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <Label className="text-xs">Tim Auditor (Nama Auditor) *</Label>
                                        <MultiPicker users={users} selected={row.team} onToggle={(id) => toggleRowArr(ri, 'team', id)} />
                                        {row.team.length === 0 && <p className="mt-1 text-[11px] text-red-600">Pilih minimal 1 auditor.</p>}
                                    </div>
                                    <div>
                                        <Label className="text-xs">Auditee — PIC departemen *</Label>
                                        <MultiPicker users={users} selected={row.auditees} onToggle={(id) => toggleRowArr(ri, 'auditees', id)} />
                                        {row.auditees.length === 0 && <p className="mt-1 text-[11px] text-red-600">Pilih minimal 1 auditee.</p>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                        <div className="flex items-center gap-1.5 font-semibold mb-1">
                            <Info className="size-3.5" /> Alur setelah submit
                        </div>
                        <ul className="list-disc pl-4 space-y-0.5">
                            <li>Tiap bagian menjadi 1 audit (IA-YYYY-XXX), dikelompokkan dalam 1 jadwal (SA-YYYY-XXX).</li>
                            <li><b>Management Representative</b> me-review &amp; tanda tangan jadwal terlebih dahulu.</li>
                            <li>Setelah disetujui, <b>Document Control</b> membagikan jadwal ke email auditee.</li>
                        </ul>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
                        <Button type="submit" className="bg-[#b91c1c] hover:bg-[#7f1d1d]" disabled={form.processing}>
                            {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                            {isEdit ? 'Simpan Perubahan' : 'Submit Jadwal'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function MultiPicker({
    users, selected, onToggle,
}: {
    users: UserOpt[];
    selected: number[];
    onToggle: (id: number) => void;
}) {
    return (
        <div className="mt-1 max-h-28 overflow-y-auto rounded border border-input bg-background p-2 text-sm">
            {users.length === 0 && <span className="text-xs text-muted-foreground">Belum ada user aktif.</span>}
            <div className="flex flex-wrap gap-1">
                {users.map((u) => {
                    const on = selected.includes(u.id);
                    return (
                        <button
                            key={u.id}
                            type="button"
                            onClick={() => onToggle(u.id)}
                            className={`rounded-full px-2 py-0.5 text-xs ${
                                on ? 'bg-[#b91c1c] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            {u.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
