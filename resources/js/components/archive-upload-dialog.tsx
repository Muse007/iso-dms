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
import { RevisionSelect } from '@/components/revision-select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { Archive, Loader2, Upload } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';

interface Department { id: number; name: string }

interface Props {
    trigger?: ReactNode;
    departments: Department[];
    /** Optional controlled open state. */
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
    { value: 'iso_9001', label: 'ISO 9001 : 2015' },
    { value: 'iso_14001', label: 'ISO 14001 : 2015' },
    { value: 'iso_45001', label: 'ISO 45001 : 2018' },
    { value: 'iatf', label: 'IATF 16949 : 2016' },
    { value: 'internal', label: 'Internal' },
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
    file: File | null;
};

export function ArchiveUploadDialog({ trigger, departments, open: controlledOpen, onOpenChange }: Props) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;

    const { data, setData, post, processing, errors, reset, transform, progress } = useForm<FormShape>({
        code: '',
        title: '',
        type: 'sop',
        standards: ['iso_9001'],
        department_id: '',
        description: '',
        effective_date: '',
        next_review_date: '',
        current_revision: '00',
        file: null,
    });

    useEffect(() => {
        if (!open) reset();
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    transform((d) => ({
        ...d,
        department_id: d.department_id === '' ? null : Number(d.department_id),
    }));

    const toggleStandard = (val: string) => {
        const has = data.standards.includes(val);
        setData('standards', has ? data.standards.filter((s) => s !== val) : [...data.standards, val]);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/documents/archive', {
            forceFormData: true,
            onSuccess: () => setOpen(false),
            preserveScroll: true,
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger ?? null}
            <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Archive className="size-5 text-[#b91c1c]" /> Upload Arsip Dokumen
                    </DialogTitle>
                    <DialogDescription>
                        Dokumen arsip langsung tersimpan sebagai <b>published</b> tanpa proses approval. Hanya untuk
                        Document Control &amp; Administrator.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="ar-code">Document Code *</Label>
                            <Input
                                id="ar-code"
                                placeholder="e.g. BTI PR-IT-002"
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value)}
                                className="font-mono"
                            />
                            {errors.code && <p className="text-xs text-red-600">{errors.code}</p>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="ar-rev">Revision *</Label>
                            <RevisionSelect
                                value={data.current_revision}
                                onChange={(v) => setData('current_revision', v)}
                            />
                            {errors.current_revision && <p className="text-xs text-red-600">{errors.current_revision}</p>}
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="ar-title">Title *</Label>
                        <Input
                            id="ar-title"
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

                    <div className="grid gap-2 rounded-md border bg-muted/30 p-3">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            ISO Standards *
                        </Label>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {STANDARDS.map((s) => {
                                const checked = data.standards.includes(s.value);
                                return (
                                    <label
                                        key={s.value}
                                        className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm transition-colors ${
                                            checked ? 'border-[#b91c1c] bg-red-50 dark:bg-red-950/20' : 'hover:bg-muted/50'
                                        }`}
                                    >
                                        <Checkbox checked={checked} onCheckedChange={() => toggleStandard(s.value)} />
                                        <span className="font-medium">{s.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                        {errors.standards && <p className="text-xs text-red-600">{errors.standards as string}</p>}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="ar-eff">Effective Date</Label>
                            <Input
                                id="ar-eff"
                                type="date"
                                value={data.effective_date}
                                onChange={(e) => setData('effective_date', e.target.value)}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="ar-next">Next Review</Label>
                            <Input
                                id="ar-next"
                                type="date"
                                value={data.next_review_date}
                                onChange={(e) => setData('next_review_date', e.target.value)}
                            />
                            {errors.next_review_date && <p className="text-xs text-red-600">{errors.next_review_date}</p>}
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="ar-desc">Description</Label>
                        <Textarea
                            id="ar-desc"
                            rows={2}
                            placeholder="Keterangan arsip…"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="ar-file">File arsip *</Label>
                        <label
                            htmlFor="ar-file"
                            className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm hover:bg-muted/50"
                        >
                            <Upload className="size-4 text-muted-foreground" />
                            <span className="truncate text-muted-foreground">
                                {data.file ? data.file.name : 'Choose PDF, DOCX, XLSX…'}
                            </span>
                        </label>
                        <Input
                            id="ar-file"
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
                            className="hidden"
                            onChange={(e) => setData('file', e.target.files?.[0] ?? null)}
                        />
                        {progress && (
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div className="h-full bg-[#dc2626] transition-all" style={{ width: `${progress.percentage}%` }} />
                            </div>
                        )}
                        {errors.file && <p className="text-xs text-red-600">{errors.file}</p>}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={processing} className="gap-1.5 bg-[#b91c1c] hover:bg-[#991b1b]">
                            {processing ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />}
                            Upload arsip
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
