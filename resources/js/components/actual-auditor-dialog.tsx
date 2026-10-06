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
import { Textarea } from '@/components/ui/textarea';
import { router, useForm } from '@inertiajs/react';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

interface UserOpt { id: number; name: string }

interface Props {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    auditId: number;
    auditCode: string;
    /** Auditor sesuai jadwal FM-BDK-007 — ditampilkan sebagai pembanding. */
    plannedLeadName: string;
    plannedTeam: UserOpt[];
    actualLeadAuditorId: number | null;
    /** null = belum pernah dicatat, sehingga masih mengikuti rencana. */
    actualTeamIds: number[] | null;
    reason: string | null;
    users: UserOpt[];
}

export function ActualAuditorDialog({
    open,
    onOpenChange,
    auditId,
    auditCode,
    plannedLeadName,
    plannedTeam,
    actualLeadAuditorId,
    actualTeamIds,
    reason,
    users,
}: Props) {
    const hasChange = actualLeadAuditorId !== null || actualTeamIds !== null;
    const [q, setQ] = useState('');

    const form = useForm<{
        actual_lead_auditor_id: number | null;
        actual_team: number[];
        reason: string;
    }>({
        actual_lead_auditor_id: actualLeadAuditorId,
        actual_team: actualTeamIds ?? plannedTeam.map((u) => u.id),
        reason: reason ?? '',
    });

    // Selaraskan isi form setiap dialog dibuka ulang agar tidak menampilkan sisa editan.
    useEffect(() => {
        if (!open) return;
        form.setData({
            actual_lead_auditor_id: actualLeadAuditorId,
            actual_team: actualTeamIds ?? plannedTeam.map((u) => u.id),
            reason: reason ?? '',
        });
        setQ('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, actualLeadAuditorId, reason]);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return needle ? users.filter((u) => u.name.toLowerCase().includes(needle)) : users;
    }, [q, users]);

    const toggle = (id: number) => {
        const next = form.data.actual_team.includes(id)
            ? form.data.actual_team.filter((x) => x !== id)
            : [...form.data.actual_team, id];
        form.setData('actual_team', next);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(`/audits/${auditId}/actual-auditors`, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    const resetToPlan = () => {
        router.post(
            `/audits/${auditId}/actual-auditors`,
            { reset: 1 },
            { preserveScroll: true, onSuccess: () => onOpenChange(false) },
        );
    };

    const plannedTeamLabel = plannedTeam.length > 0 ? plannedTeam.map((u) => u.name).join(', ') : '—';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Auditor Aktual · {auditCode}</DialogTitle>
                    <DialogDescription>
                        Catat auditor yang benar-benar melaksanakan audit bila berbeda dari jadwal.
                        Jadwal FM-BDK-007 yang sudah disetujui MR tidak ikut berubah.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-3">
                    <div className="rounded border bg-muted/40 p-3 text-xs">
                        <div className="mb-1 font-semibold text-muted-foreground">Sesuai jadwal (rencana)</div>
                        <div>Lead Auditor: <span className="font-medium">{plannedLeadName}</span></div>
                        <div>Tim Auditor: <span className="font-medium">{plannedTeamLabel}</span></div>
                    </div>

                    <div>
                        <Label>Lead Auditor Aktual</Label>
                        <select
                            value={form.data.actual_lead_auditor_id ?? ''}
                            onChange={(e) =>
                                form.setData('actual_lead_auditor_id', e.target.value ? Number(e.target.value) : null)
                            }
                            className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option value="">— sama dengan rencana ({plannedLeadName}) —</option>
                            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        {form.errors.actual_lead_auditor_id && (
                            <p className="text-xs text-red-600">{form.errors.actual_lead_auditor_id}</p>
                        )}
                    </div>

                    <div>
                        <Label>Tim Auditor Aktual</Label>
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Cari nama…"
                            className="mt-1"
                        />
                        <div className="mt-2 max-h-48 overflow-y-auto rounded border">
                            {filtered.length === 0 && (
                                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                                    Tidak ada nama yang cocok.
                                </div>
                            )}
                            {filtered.map((u) => (
                                <label
                                    key={u.id}
                                    className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/50"
                                >
                                    <Checkbox
                                        checked={form.data.actual_team.includes(u.id)}
                                        onCheckedChange={() => toggle(u.id)}
                                    />
                                    <span>{u.name}</span>
                                </label>
                            ))}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                            {form.data.actual_team.length} auditor dipilih. Lead auditor tidak perlu dicentang di sini.
                        </p>
                        {form.errors.actual_team && <p className="text-xs text-red-600">{form.errors.actual_team}</p>}
                    </div>

                    <div>
                        <Label>Alasan Perubahan <span className="text-red-600">*</span></Label>
                        <Textarea
                            rows={2}
                            value={form.data.reason}
                            onChange={(e) => form.setData('reason', e.target.value)}
                            placeholder="mis. Apriyanto berhalangan, digantikan Adi Supriadi"
                            required
                        />
                        {form.errors.reason && <p className="text-xs text-red-600">{form.errors.reason}</p>}
                    </div>

                    <DialogFooter className="gap-2 sm:justify-between">
                        {hasChange ? (
                            <Button type="button" variant="outline" onClick={resetToPlan}>
                                <RotateCcw className="size-4" /> Kembalikan ke rencana
                            </Button>
                        ) : <span />}
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
                            <Button type="submit" className="bg-[#b91c1c] hover:bg-[#7f1d1d]" disabled={form.processing}>
                                {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                Simpan
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
