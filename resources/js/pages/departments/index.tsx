import { DepartmentFormDialog, type ManagerOption } from '@/components/department-form-dialog';
import { EmptyRow, ModuleShell } from '@/components/module-shell';
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
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';

interface D {
    id: number;
    code: string;
    name: string;
    is_active: boolean;
    manager?: { id: number; name: string } | null;
    manager_id: number | null;
    description: string | null;
}
interface Props { departments: { data: D[]; total: number }; managers: ManagerOption[] }

export default function DepartmentsIndex({ departments, managers }: Props) {
    const destroy = (d: D) => {
        if (!window.confirm(`Delete department ${d.code} — ${d.name}?`)) return;
        router.delete(`/departments/${d.id}`, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Departments', href: '/departments' }]}>
            <Head title="Departments" />
            <ModuleShell
                title="Departments"
                subtitle="Organizational units — owner for KPI, Document, Risk"
                actions={
                    <DepartmentFormDialog
                        managers={managers}
                        trigger={
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-1.5 bg-[#b91c1c] hover:bg-[#991b1b]">
                                    <Plus className="size-4" /> New Department
                                </Button>
                            </DialogTrigger>
                        }
                    />
                }
            >
                <table className="w-full text-sm">
                    <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold">Code</th>
                            <th className="px-4 py-3 text-left font-semibold">Name</th>
                            <th className="px-4 py-3 text-left font-semibold">Manager</th>
                            <th className="px-4 py-3 text-left font-semibold">Status</th>
                            <th className="px-4 py-3 text-right font-semibold">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {departments.data.length === 0 && <EmptyRow cols={5} label="No departments yet." />}
                        {departments.data.map((d) => (
                            <tr key={d.id} className="hover:bg-muted/40">
                                <td className="px-4 py-3 font-mono text-xs">{d.code}</td>
                                <td className="px-4 py-3 font-semibold">{d.name}</td>
                                <td className="px-4 py-3 text-xs">{d.manager?.name ?? '—'}</td>
                                <td className="px-4 py-3">
                                    <Badge variant="secondary" className={d.is_active ? 'bg-emerald-500/15 text-emerald-700' : ''}>
                                        {d.is_active ? 'active' : 'inactive'}
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
                                            <DepartmentFormDialog
                                                department={{
                                                    id: d.id,
                                                    code: d.code,
                                                    name: d.name,
                                                    manager_id: d.manager_id,
                                                    description: d.description,
                                                    is_active: d.is_active,
                                                }}
                                                managers={managers}
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
                                                onClick={() => destroy(d)}
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
