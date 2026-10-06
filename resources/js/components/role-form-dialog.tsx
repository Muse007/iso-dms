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
import { useForm } from '@inertiajs/react';
import { Loader2, Save } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';

export interface RoleRecord {
    id?: number;
    name?: string;
    permissions?: string[];
    is_protected?: boolean;
}

interface Props {
    trigger: ReactNode;
    role?: RoleRecord;
    permissions: string[];
}

/**
 * Group permissions by resource (everything before the last dot).
 * e.g. "documents.create" -> resource "documents", action "create".
 */
function groupPermissions(perms: string[]): Record<string, string[]> {
    return perms.reduce<Record<string, string[]>>((acc, p) => {
        const dot = p.lastIndexOf('.');
        const resource = dot === -1 ? '_other' : p.slice(0, dot);
        (acc[resource] = acc[resource] ?? []).push(p);
        return acc;
    }, {});
}

export function RoleFormDialog({ trigger, role, permissions }: Props) {
    const [open, setOpen] = useState(false);
    const isEdit = !!role?.id;
    const isProtected = !!role?.is_protected;

    const { data, setData, post, processing, errors, reset, transform } = useForm<{
        name: string;
        permissions: string[];
    }>({
        name: role?.name ?? '',
        permissions: role?.permissions ?? [],
    });

    useEffect(() => { if (!open) reset(); }, [open]); // eslint-disable-line

    transform((d) => ({ ...d, ...(isEdit ? { _method: 'put' } : {}) }));

    const grouped = useMemo(() => groupPermissions(permissions), [permissions]);

    const togglePerm = (p: string) => {
        setData('permissions', data.permissions.includes(p)
            ? data.permissions.filter((x) => x !== p)
            : [...data.permissions, p]);
    };

    const toggleGroup = (group: string[], allChecked: boolean) => {
        if (allChecked) {
            setData('permissions', data.permissions.filter((p) => !group.includes(p)));
        } else {
            setData('permissions', Array.from(new Set([...data.permissions, ...group])));
        }
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const url = isEdit ? `/roles/${role!.id}` : '/roles';
        post(url, { onSuccess: () => setOpen(false), preserveScroll: true });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger}
            <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? `Edit Role · ${role!.name}` : 'New Role'}</DialogTitle>
                    <DialogDescription>
                        {isProtected
                            ? 'Role ini di-protect — nama tidak bisa diubah, namun permission masih bisa diatur.'
                            : 'Definisikan permission yang dimiliki role ini.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="name">Role Name *</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            disabled={isProtected}
                            className="font-mono"
                        />
                        {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Permissions ({data.permissions.length} / {permissions.length})
                        </Label>
                        <div className="grid gap-3">
                            {Object.entries(grouped).map(([resource, perms]) => {
                                const allChecked = perms.every((p) => data.permissions.includes(p));
                                const someChecked = perms.some((p) => data.permissions.includes(p));
                                return (
                                    <div key={resource} className="rounded-md border p-3">
                                        <div className="mb-2 flex items-center justify-between">
                                            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                                                <Checkbox
                                                    checked={allChecked || (someChecked ? 'indeterminate' : false)}
                                                    onCheckedChange={() => toggleGroup(perms, allChecked)}
                                                />
                                                <span className="uppercase tracking-wide">{resource}</span>
                                            </label>
                                            <span className="text-[10px] text-muted-foreground">
                                                {perms.filter((p) => data.permissions.includes(p)).length} / {perms.length}
                                            </span>
                                        </div>
                                        <div className="grid gap-1.5 sm:grid-cols-3">
                                            {perms.map((p) => {
                                                const action = p.includes('.') ? p.slice(p.lastIndexOf('.') + 1) : p;
                                                return (
                                                    <label key={p} className="flex cursor-pointer items-center gap-2 text-xs">
                                                        <Checkbox
                                                            checked={data.permissions.includes(p)}
                                                            onCheckedChange={() => togglePerm(p)}
                                                        />
                                                        <span className="font-mono">{action}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <DialogFooter className="mt-2">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={processing} className="gap-1.5 bg-[#b91c1c] hover:bg-[#991b1b]">
                            {processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            {isEdit ? 'Save changes' : 'Create role'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
