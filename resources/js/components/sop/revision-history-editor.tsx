import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

// Declared as a `type` (not interface) so it satisfies Inertia's FormDataConvertible
// index-signature constraint when used inside useForm.
export type RevisionRow = {
    revision: string;
    date: string;
    summary: string;
    page: string;
    mr: string;
};

export const emptyRevisionRow = (): RevisionRow => ({ revision: '', date: '', summary: '', page: '', mr: '' });

interface Props {
    rows: RevisionRow[];
    onChange: (rows: RevisionRow[]) => void;
}

/** Editable "Riwayat Revisi" table rendered on page 1 of the procedure PDF. */
export function RevisionHistoryEditor({ rows, onChange }: Props) {
    const setRow = (i: number, patch: Partial<RevisionRow>) =>
        onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
    const addRow = () => onChange([...rows, emptyRevisionRow()]);

    return (
        <div className="grid gap-2 rounded-md border bg-background p-3">
            <div className="flex items-center justify-between">
                <div>
                    <Label className="text-xs font-semibold">Riwayat Revisi (tampil di halaman 1 PDF)</Label>
                    <p className="text-[11px] text-muted-foreground">
                        Isi manual. Bila kosong, sistem memakai riwayat upload file otomatis.
                    </p>
                </div>
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1" onClick={addRow}>
                    <Plus className="size-3.5" /> Baris
                </Button>
            </div>

            {rows.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">Belum ada baris revisi.</p>
            ) : (
                <div className="grid gap-2">
                    {/* Header (lg only) */}
                    <div className="hidden gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid lg:grid-cols-[70px_120px_1fr_60px_140px_32px]">
                        <span>No. Rev</span>
                        <span>Tanggal</span>
                        <span>Ringkasan Perubahan</span>
                        <span>Hal</span>
                        <span>Disetujui Oleh</span>
                        <span />
                    </div>
                    {rows.map((r, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-2 gap-2 rounded-md border p-2 lg:grid-cols-[70px_120px_1fr_60px_140px_32px] lg:border-0 lg:p-0"
                        >
                            <Input
                                className="h-8"
                                placeholder="0"
                                value={r.revision}
                                onChange={(e) => setRow(i, { revision: e.target.value })}
                            />
                            <Input
                                className="h-8"
                                placeholder="28 Agustus 2023"
                                value={r.date}
                                onChange={(e) => setRow(i, { date: e.target.value })}
                            />
                            <Input
                                className="col-span-2 h-8 lg:col-span-1"
                                placeholder="Ringkasan perubahan"
                                value={r.summary}
                                onChange={(e) => setRow(i, { summary: e.target.value })}
                            />
                            <Input
                                className="h-8"
                                placeholder="1"
                                value={r.page}
                                onChange={(e) => setRow(i, { page: e.target.value })}
                            />
                            <Input
                                className="h-8"
                                placeholder="Nama penyetuju"
                                value={r.mr}
                                onChange={(e) => setRow(i, { mr: e.target.value })}
                            />
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                                onClick={() => removeRow(i)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
