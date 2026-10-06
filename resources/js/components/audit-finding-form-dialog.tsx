import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { FilePicker } from '@/components/file-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { Loader2, Plus } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

interface UserOpt { id: number; name: string; department_id: number | null }

export interface FindingEdit {
    id: number;
    category: string;
    clause: string | null;
    description: string;
    evidence: string | null;
    finding_owner_id: number | null;
    due_date: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    auditId: number;
    users: UserOpt[];
    /** Bila diisi → mode edit temuan. */
    finding?: FindingEdit | null;
}

export function AuditFindingFormDialog({ open, onOpenChange, auditId, users, finding }: Props) {
    const isEdit = !!finding;
    // Kunci simpan selama masih ada berkas yang ditolak FilePicker, agar tidak
    // ada temuan tersimpan sementara evidence-nya diam-diam tidak ikut terkirim.
    const [blocked, setBlocked] = useState(false);
    const form = useForm<{
        category: string;
        clause: string;
        description: string;
        evidence: string;
        finding_owner_id: number | null;
        due_date: string;
        evidence_files: File[];
    }>({
        category: '',
        clause: '',
        description: '',
        evidence: '',
        finding_owner_id: null,
        due_date: '',
        evidence_files: [],
    });

    // Pra-isi form saat membuka dalam mode edit; bersihkan saat mode tambah.
    useEffect(() => {
        if (!open) return;
        if (finding) {
            form.setData({
                category: finding.category ?? '',
                clause: finding.clause ?? '',
                description: finding.description ?? '',
                evidence: finding.evidence ?? '',
                finding_owner_id: finding.finding_owner_id ?? null,
                due_date: finding.due_date ?? '',
                evidence_files: [],
            });
        } else {
            form.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, finding?.id]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (isEdit && finding) {
            // Edit: kirim via POST + method spoofing (_method=put) agar upload evidence ikut terkirim.
            form.transform((d) => ({ ...d, _method: 'put' }));
            form.post(`/audits/${auditId}/findings/${finding.id}`, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => { onOpenChange(false); form.setData('evidence_files', []); },
            });
            return;
        }
        form.post(`/audits/${auditId}/findings`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                form.reset();
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Temuan Audit' : 'Tambah Temuan Audit'}</DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Ubah detail temuan. Hanya bisa dilakukan selama auditee belum submit tindakan perbaikan.'
                            : 'PFI = perbaikan tanpa approval atasan (tetap diberi due date). Minor/Major = root cause + corrective & preventive action + approval atasan.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Kategori <span className="text-red-600">*</span></Label>
                            <select
                                value={form.data.category}
                                onChange={(e) => form.setData('category', e.target.value)}
                                className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                                required
                            >
                                <option value="" disabled>— pilih kategori —</option>
                                <option value="opportunity">PFI (Opportunity)</option>
                                <option value="minor_nc">Minor NC</option>
                                <option value="major_nc">Major NC</option>
                            </select>
                            {form.errors.category && <p className="text-xs text-red-600">{form.errors.category}</p>}
                        </div>
                        <div>
                            <Label>Klausul <span className="text-red-600">*</span></Label>
                            <Input
                                value={form.data.clause}
                                onChange={(e) => form.setData('clause', e.target.value)}
                                placeholder="7.1.5"
                                required
                            />
                            {form.errors.clause && <p className="text-xs text-red-600">{form.errors.clause}</p>}
                        </div>
                        <div className="col-span-2">
                            <Label>Deskripsi Temuan</Label>
                            <Textarea
                                rows={3}
                                value={form.data.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                                required
                            />
                            {form.errors.description && <p className="text-xs text-red-600">{form.errors.description}</p>}
                        </div>
                        <div className="col-span-2">
                            <Label>Evidence (catatan singkat)</Label>
                            <Textarea
                                rows={2}
                                value={form.data.evidence}
                                onChange={(e) => form.setData('evidence', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>PIC Auditee <span className="text-red-600">*</span></Label>
                            <select
                                value={form.data.finding_owner_id ?? ''}
                                onChange={(e) => form.setData('finding_owner_id', e.target.value ? Number(e.target.value) : null)}
                                className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                                required
                            >
                                <option value="">— pilih —</option>
                                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            {form.errors.finding_owner_id && <p className="text-xs text-red-600">{form.errors.finding_owner_id}</p>}
                        </div>
                        <div>
                            <Label>Due Date <span className="text-red-600">*</span></Label>
                            <Input
                                type="date"
                                value={form.data.due_date}
                                onChange={(e) => form.setData('due_date', e.target.value)}
                                required
                            />
                            {form.errors.due_date && <p className="text-xs text-red-600">{form.errors.due_date}</p>}
                        </div>
                        <div className="col-span-2">
                            <FilePicker
                                label={isEdit ? 'Tambah Evidence' : 'Upload Evidence'}
                                value={form.data.evidence_files}
                                onChange={(files) => form.setData('evidence_files', files)}
                                onBlockedChange={setBlocked}
                                error={
                                    (form.errors as Record<string, string>)['evidence_files'] ??
                                    (form.errors as Record<string, string>)['evidence_files.0']
                                }
                            />
                            {isEdit && <p className="mt-1 text-[11px] text-muted-foreground">Evidence yang sudah ada tetap tersimpan; file baru akan ditambahkan.</p>}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
                        <Button type="submit" className="bg-[#b91c1c] hover:bg-[#7f1d1d]" disabled={form.processing || blocked}>
                            {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                            {isEdit ? 'Simpan Perubahan' : 'Simpan Temuan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
