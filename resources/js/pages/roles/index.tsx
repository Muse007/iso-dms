import { EmptyRow, ModuleShell } from '@/components/module-shell';
import { RoleFormDialog, type RoleRecord } from '@/components/role-form-dialog';
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
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Lock, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';

interface R extends RoleRecord {
    id: number;
    name: string;
    permissions: string[];
    users_count: number;
    is_protected: boolean;
}

interface Props { roles: R[]; permissions: string[] }

export default function RolesIndex({ roles, permissions }: Props) {
    const destroy = (r: R) => {
        if (!window.confirm(`Delete role ${r.name}?`)) return;
        router.delete(`/roles/${r.id}`, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Roles & Permissions', href: '/roles' }]}>
            <Head title="Roles & Permissions" />
            <ModuleShell
                title="Roles & Permissions"
                subtitle="RBAC — role granular per resource (Spatie Permission)"
                actions={
                    <RoleFormDialog
                        permissions={permissions}
                        trigger={
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-1.5 bg-[#b91c1c] hover:bg-[#991b1b]">
                                    <Plus className="size-4" /> New Role
                                </Button>
                            </DialogTrigger>
                        }
                    />
                }
            >
                <table className="w-full text-sm">
                    <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold">Role</th>
                            <th className="px-4 py-3 text-left font-semibold">Permissions</th>
                            <th className="px-4 py-3 text-left font-semibold">Users</th>
                            <th className="px-4 py-3 text-right font-semibold">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {roles.length === 0 && <EmptyRow cols={4} label="No roles yet." />}
                        {roles.map((r) => (
                            <tr key={r.id} className="hover:bg-muted/40">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2 font-semibold">
                                        {r.is_protected && <Lock className="size-3.5 text-amber-600" />}
                                        <span className="font-mono">{r.name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-xs text-muted-foreground">{r.permissions.length} permissions</span>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {r.permissions.slice(0, 6).map((p) => (
                                            <Badge key={p} variant="secondary" className="text-[10px] font-mono">{p}</Badge>
                                        ))}
                                        {r.permissions.length > 6 && (
                                            <Badge variant="secondary" className="text-[10px]">
                                                +{r.permissions.length - 6} more
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-xs">{r.users_count}</td>
                                <td className="px-4 py-3 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-7 w-7">
                                                <MoreHorizontal className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-44">
                                            <RoleFormDialog
                                                role={r}
                                                permissions={permissions}
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
                                                disabled={r.is_protected || r.users_count > 0}
                                                onClick={() => destroy(r)}
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
            </ModuleShell>
        </AppLayout>
    );
}
