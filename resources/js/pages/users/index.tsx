import { EmptyRow, ModuleShell } from '@/components/module-shell';
import { UserFormDialog, type UserRecord } from '@/components/user-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogTrigger } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface U extends UserRecord {
    id: number;
    name: string;
    email: string;
    position: string | null;
    employee_no: string | null;
    phone: string | null;
    address: string | null;
    status: string;
    department: { id: number; name: string } | null;
    department_id: number | null;
    roles: { id: number; name: string }[];
    signature_url: string | null;
    signature_path: string | null;
    stamp_url: string | null;
    stamp_path: string | null;
}
interface Department { id: number; name: string }
interface Role { id: number; name: string }

interface Props {
    users: {
        data: U[];
        total: number;
        current_page: number;
        last_page: number;
        per_page: number;
        from: number | null;
        to: number | null;
    };
    filters: { q?: string };
    departments: Department[];
    roles: Role[];
}

export default function UsersIndex({ users, filters, departments, roles }: Props) {
    const [q, setQ] = useState(filters.q ?? '');

    const destroy = (u: U) => {
        if (!window.confirm(`Delete user ${u.email}?`)) return;
        router.delete(`/users/${u.id}`, { preserveScroll: true });
    };

    const search = (e: React.FormEvent) => {
        e.preventDefault();
        const params = q.trim() ? { q: q.trim() } : {};
        router.get('/users', params, { preserveState: true, replace: true });
    };

    const goToPage = (page: number) => {
        const params: Record<string, string | number> = { page };
        if (filters.q) params.q = filters.q;
        router.get('/users', params, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Users', href: '/users' }]}>
            <Head title="Users" />
            <ModuleShell
                title="Users"
                subtitle="Identity, role, department, digital signature"
                actions={
                    <>
                        <form onSubmit={search} className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input
                                className="h-9 w-64 pl-9"
                                placeholder="Cari nama, email, NIP, jabatan..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                        </form>
                        <UserFormDialog
                            departments={departments}
                            roles={roles}
                            trigger={
                                <DialogTrigger asChild>
                                    <Button size="sm" className="gap-1.5 bg-[#b91c1c] hover:bg-[#991b1b]">
                                        <Plus className="size-4" /> New User
                                    </Button>
                                </DialogTrigger>
                            }
                        />
                    </>
                }
            >
                <table className="w-full text-sm">
                    <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold">Name</th>
                            <th className="px-4 py-3 text-left font-semibold">Email</th>
                            <th className="px-4 py-3 text-left font-semibold">Alamat</th>
                            <th className="px-4 py-3 text-left font-semibold">Department</th>
                            <th className="px-4 py-3 text-left font-semibold">Roles</th>
                            <th className="px-4 py-3 text-left font-semibold">Sign</th>
                            <th className="px-4 py-3 text-left font-semibold">Stamp</th>
                            <th className="px-4 py-3 text-left font-semibold">Status</th>
                            <th className="px-4 py-3 text-right font-semibold">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.data.length === 0 && (
                            <EmptyRow cols={9} label={filters.q ? `Tidak ada user yang cocok dengan "${filters.q}".` : 'No users yet.'} />
                        )}
                        {users.data.map((u) => (
                            <tr key={u.id} className="hover:bg-muted/40">
                                <td className="px-4 py-3">
                                    <div className="font-semibold">{u.name}</div>
                                    {u.position && <div className="text-xs text-muted-foreground">{u.position}</div>}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                                <td className="px-4 py-3 max-w-[220px] truncate text-xs" title={u.address ?? ''}>{u.address ?? '—'}</td>
                                <td className="px-4 py-3 text-xs">{u.department?.name ?? '—'}</td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                        {u.roles.map((r) => (
                                            <Badge key={r.id} variant="secondary" className="text-[10px]">{r.name}</Badge>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {u.signature_url ? (
                                        <div className="flex h-8 w-20 items-center justify-center rounded border bg-muted/40">
                                            <img src={u.signature_url} alt="sig" className="max-h-full max-w-full object-contain" />
                                        </div>
                                    ) : (
                                        <span className="text-[11px] italic text-muted-foreground">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {u.stamp_url ? (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted/40">
                                            <img src={u.stamp_url} alt="stamp" className="max-h-full max-w-full object-contain" />
                                        </div>
                                    ) : (
                                        <span className="text-[11px] italic text-muted-foreground">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant="secondary" className={u.status === 'active' ? 'bg-emerald-500/15 text-emerald-700' : ''}>
                                        {u.status}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-7 w-7">
                                                <MoreHorizontal className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-44">
                                            <UserFormDialog
                                                user={u}
                                                departments={departments}
                                                roles={roles}
                                                trigger={
                                                    <DialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center gap-2">
                                                            <Pencil className="size-4" /> Edit
                                                        </DropdownMenuItem>
                                                    </DialogTrigger>
                                                }
                                            />
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="flex items-center gap-2 text-red-600 focus:text-red-700"
                                                onClick={() => destroy(u)}
                                            >
                                                <Trash2 className="size-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row">
                    <div>
                        {users.total > 0 ? (
                            <>
                                Menampilkan <span className="font-medium text-foreground">{users.from}</span>–
                                <span className="font-medium text-foreground">{users.to}</span> dari{' '}
                                <span className="font-medium text-foreground">{users.total}</span> user
                            </>
                        ) : (
                            'Tidak ada data'
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs">
                            Halaman {users.current_page} / {users.last_page}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled={users.current_page <= 1}
                            onClick={() => goToPage(users.current_page - 1)}
                        >
                            <ChevronLeft className="size-4" /> Prev
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled={users.current_page >= users.last_page}
                            onClick={() => goToPage(users.current_page + 1)}
                        >
                            Next <ChevronRight className="size-4" />
                        </Button>
                    </div>
                </div>
            </ModuleShell>
        </AppLayout>
    );
}
