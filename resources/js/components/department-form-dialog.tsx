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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { Loader2, Save } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';

export interface DepartmentRecord {
    id?: number;
    code?: string;
    name?: string;
    parent_id?: number | null;
    manager_id?: number | null;
    description?: string | null;
    is_active?: boolean;
}

export interface ManagerOption { id: number; name: string; position: string | null }

interface Props {
    trigger: ReactNode;
    department?: DepartmentRecord;
    managers: ManagerOption[];
}

export function DepartmentFormDialog({ trigger, department, managers }: Props) {
    const [open, setOpen] = useState(false);
    const isEdit = !!department?.id;

    const { data, setData, post, processing, errors, reset, transform } = useForm({
        code: department?.code ?? '',
        name: department?.name ?? '',
        manager_id: department?.manager_id ? String(department.manager_id) : '',
        description: department?.description ?? '',
        is_active: department?.is_active ?? true,
    });

    useEffect(() => { if (!open) reset(); }, [open]); // eslint-disable-line

    transform((d) => ({
        ...d,
        manager_id: d.manager_id === '' ? null : Number(d.manager_id),
        ...(isEdit ? { _method: 'put' } : {}),
    }));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const url = isEdit ? `/departments/${department!.id}` : '/departments';
        post(url, { onSuccess: () => setOpen(false), preserveScroll: true });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger}
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Department' : 'New Department'}</DialogTitle>
                    <DialogDescription>Organizational unit — owner for documents, KPIs, risks.</DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                        <div className="grid gap-1.5">
                            <Label htmlFor="code">Code *</Label>
                            <Input
                                id="code"
                                placeholder="IT"
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value)}
                                className="font-mono"
                                disabled={isEdit}
                            />
                            {errors.code && <p className="text-xs text-red-600">{errors.code}</p>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                placeholder="Information Technology"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                            />
                            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label>Manager</Label>
                        <Select
                            value={data.manager_id === '' ? '_none' : data.manager_id}
                            onValueChange={(v) => setData('manager_id', v === '_none' ? '' : v)}
                        >
                            <SelectTrigger><SelectValue placeholder="Pilih manager…" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_none">— Belum ditentukan —</SelectItem>
                                {managers.map((m) => (
                                    <SelectItem key={m.id} value={String(m.id)}>
                                        {m.name}{m.position ? ` · ${m.position}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            rows={2}
                            value={data.description ?? ''}
                            onChange={(e) => setData('description', e.target.value)}
                        />
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={data.is_active}
                            onChange={(e) => setData('is_active', e.target.checked)}
                            className="size-4"
                        />
                        Active
                    </label>

                    <DialogFooter className="mt-2">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={processing} className="gap-1.5 bg-[#b91c1c] hover:bg-[#991b1b]">
                            {processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            {isEdit ? 'Save changes' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
