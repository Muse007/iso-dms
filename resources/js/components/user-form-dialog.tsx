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
import { useForm } from '@inertiajs/react';
import { Loader2, Save, Upload } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';

export interface UserRecord {
    id?: number;
    name?: string;
    email?: string;
    department_id?: number | null;
    employee_no?: string | null;
    position?: string | null;
    phone?: string | null;
    address?: string | null;
    status?: string;
    roles?: { id: number; name: string }[];
    signature_url?: string | null;
    signature_path?: string | null;
    stamp_url?: string | null;
    stamp_path?: string | null;
}

interface Department { id: number; name: string }
interface Role { id: number; name: string }

interface Props {
    trigger: ReactNode;
    user?: UserRecord;
    departments: Department[];
    roles: Role[];
}

export function UserFormDialog({ trigger, user, departments, roles }: Props) {
    const [open, setOpen] = useState(false);
    const isEdit = !!user?.id;

    const { data, setData, post, processing, errors, reset, transform } = useForm<{
        name: string;
        email: string;
        password: string;
        department_id: string;
        employee_no: string;
        position: string;
        phone: string;
        address: string;
        status: string;
        roles: string[];
        signature: File | null;
        stamp: File | null;
    }>({
        name: user?.name ?? '',
        email: user?.email ?? '',
        password: '',
        department_id: user?.department_id ? String(user.department_id) : '',
        employee_no: user?.employee_no ?? '',
        position: user?.position ?? '',
        phone: user?.phone ?? '',
        address: user?.address ?? '',
        status: user?.status ?? 'active',
        roles: user?.roles?.map((r) => r.name) ?? [],
        signature: null,
        stamp: null,
    });

    useEffect(() => { if (!open) reset(); }, [open]); // eslint-disable-line

    transform((d) => ({
        ...d,
        department_id: d.department_id === '' ? null : Number(d.department_id),
        ...(isEdit ? { _method: 'put' } : {}),
    }));

    const toggleRole = (name: string) => {
        setData('roles', data.roles.includes(name)
            ? data.roles.filter((r) => r !== name)
            : [...data.roles, name]);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const url = isEdit ? `/users/${user!.id}` : '/users';
        post(url, { forceFormData: true, onSuccess: () => setOpen(false), preserveScroll: true });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger}
            <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit User' : 'New User'}</DialogTitle>
                    <DialogDescription>
                        Identity, role, department. Tanda tangan dipakai pada signature block Prosedur.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="name">Name *</Label>
                            <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} />
                            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="email">Email *</Label>
                            <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                            {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="password">{isEdit ? 'New password (kosongkan = tidak ubah)' : 'Password *'}</Label>
                            <Input
                                id="password"
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                autoComplete="new-password"
                            />
                            {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="employee_no">Employee No.</Label>
                            <Input
                                id="employee_no"
                                value={data.employee_no}
                                onChange={(e) => setData('employee_no', e.target.value)}
                                className="font-mono"
                            />
                            {errors.employee_no && <p className="text-xs text-red-600">{errors.employee_no}</p>}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="grid gap-1.5">
                            <Label>Department</Label>
                            <Select
                                value={data.department_id === '' ? '_none' : data.department_id}
                                onValueChange={(v) => setData('department_id', v === '_none' ? '' : v)}
                            >
                                <SelectTrigger><SelectValue placeholder="Pilih…" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_none">— None —</SelectItem>
                                    {departments.map((d) => (
                                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="position">Position</Label>
                            <Input id="position" value={data.position} onChange={(e) => setData('position', e.target.value)} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="address">Alamat</Label>
                        <Input id="address" value={data.address} onChange={(e) => setData('address', e.target.value)} placeholder="Alamat lengkap" />
                    </div>

                    <div className="grid gap-1.5">
                        <Label>Status *</Label>
                        <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Roles */}
                    <div className="grid gap-2 rounded-md border bg-muted/30 p-3">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Roles</Label>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {roles.map((r) => {
                                const checked = data.roles.includes(r.name);
                                return (
                                    <label
                                        key={r.id}
                                        className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm ${
                                            checked ? 'border-[#b91c1c] bg-red-50 dark:bg-red-950/20' : 'hover:bg-muted/50'
                                        }`}
                                    >
                                        <Checkbox checked={checked} onCheckedChange={() => toggleRole(r.name)} />
                                        <span>{r.name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Signature upload */}
                    <FileUploadField
                        id="signature"
                        label="Digital Signature (PNG/JPG)"
                        accept=".png,.jpg,.jpeg"
                        file={data.signature}
                        existingUrl={user?.signature_url ?? null}
                        onChange={(f) => setData('signature', f)}
                        error={errors.signature}
                        emptyLabel="Belum upload TTD"
                    />

                    {/* Stamp upload — only relevant for Document Control users */}
                    {data.roles.includes('document_control') && (
                        <FileUploadField
                            id="stamp"
                            label="Stempel Digital (PNG/JPG) — untuk pengesahan dokumen"
                            accept=".png,.jpg,.jpeg"
                            file={data.stamp}
                            existingUrl={user?.stamp_url ?? null}
                            onChange={(f) => setData('stamp', f)}
                            error={errors.stamp}
                            emptyLabel="Belum upload stempel"
                            previewClass="h-24 w-24 rounded-full"
                        />
                    )}

                    <DialogFooter className="mt-2">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={processing} className="gap-1.5 bg-[#b91c1c] hover:bg-[#991b1b]">
                            {processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            {isEdit ? 'Save changes' : 'Create user'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function FileUploadField({
    id,
    label,
    accept,
    file,
    existingUrl,
    onChange,
    error,
    emptyLabel,
    previewClass,
}: {
    id: string;
    label: string;
    accept: string;
    file: File | null;
    existingUrl: string | null;
    onChange: (f: File | null) => void;
    error?: string;
    emptyLabel: string;
    previewClass?: string;
}) {
    return (
        <div className="grid gap-1.5">
            <Label htmlFor={id}>{label}</Label>
            <div className="flex items-start gap-3">
                <div className={`flex items-center justify-center rounded-md border bg-muted/40 ${previewClass ?? 'h-24 w-44'}`}>
                    {file ? (
                        <img src={URL.createObjectURL(file)} alt="preview" className="max-h-full max-w-full object-contain" />
                    ) : existingUrl ? (
                        <img src={existingUrl} alt="current" className="max-h-full max-w-full object-contain" />
                    ) : (
                        <span className="px-2 text-center text-[11px] italic text-muted-foreground">{emptyLabel}</span>
                    )}
                </div>
                <div className="grid flex-1 gap-1.5">
                    <label
                        htmlFor={id}
                        className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm hover:bg-muted/50"
                    >
                        <Upload className="size-4 text-muted-foreground" />
                        <span className="truncate text-muted-foreground">{file ? file.name : `Choose ${accept}`}</span>
                    </label>
                    <Input
                        id={id}
                        type="file"
                        accept={accept}
                        className="hidden"
                        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                    />
                    {file && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
                            Clear
                        </Button>
                    )}
                    {error && <p className="text-xs text-red-600">{error}</p>}
                </div>
            </div>
        </div>
    );
}
