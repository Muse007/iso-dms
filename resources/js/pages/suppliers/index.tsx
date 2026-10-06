import { EmptyRow, ModuleShell } from '@/components/module-shell';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';

interface Supplier { id: number; code: string; name: string; status: string; latest_score: number | null; approved_until: string | null }
interface Props { suppliers: { data: Supplier[]; total: number } }

const statusColor: Record<string, string> = {
    approved: 'bg-emerald-500/15 text-emerald-700',
    conditional: 'bg-amber-500/15 text-amber-700',
    rejected: 'bg-red-600/15 text-red-700',
    pending: 'bg-zinc-500/15 text-zinc-500',
};

export default function SuppliersIndex({ suppliers }: Props) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Suppliers', href: '/suppliers' }]}>
            <Head title="Supplier Evaluation" />
            <ModuleShell title="Supplier Evaluation" subtitle="Periodic scoring · Approved · Conditional · Rejected">
                <table className="w-full text-sm">
                    <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold">Code</th>
                            <th className="px-4 py-3 text-left font-semibold">Name</th>
                            <th className="px-4 py-3 text-left font-semibold">Latest Score</th>
                            <th className="px-4 py-3 text-left font-semibold">Status</th>
                            <th className="px-4 py-3 text-left font-semibold">Approved Until</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {suppliers.data.length === 0 && <EmptyRow cols={5} label="No suppliers yet." />}
                        {suppliers.data.map((s) => (
                            <tr key={s.id} className="hover:bg-muted/40">
                                <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                                <td className="px-4 py-3">{s.name}</td>
                                <td className="px-4 py-3 font-mono">{s.latest_score ?? '—'}</td>
                                <td className="px-4 py-3"><Badge variant="secondary" className={statusColor[s.status]}>{s.status}</Badge></td>
                                <td className="px-4 py-3 font-mono text-xs">{s.approved_until ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ModuleShell>
        </AppLayout>
    );
}
