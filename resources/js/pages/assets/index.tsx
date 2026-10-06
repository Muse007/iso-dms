import { EmptyRow, ModuleShell } from '@/components/module-shell';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';

interface A { id: number; code: string; name: string; status: string; next_calibration_date: string | null; department?: { name: string } }
interface Props { assets: { data: A[]; total: number } }

export default function AssetsIndex({ assets }: Props) {
    const today = new Date().toISOString().slice(0, 10);
    return (
        <AppLayout breadcrumbs={[{ title: 'Calibration', href: '/assets' }]}>
            <Head title="Asset Calibration" />
            <ModuleShell title="Asset Calibration" subtitle="Measurement traceability — schedule, certificate, tolerance">
                <table className="w-full text-sm">
                    <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold">Code</th>
                            <th className="px-4 py-3 text-left font-semibold">Asset</th>
                            <th className="px-4 py-3 text-left font-semibold">Department</th>
                            <th className="px-4 py-3 text-left font-semibold">Next Due</th>
                            <th className="px-4 py-3 text-left font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {assets.data.length === 0 && <EmptyRow cols={5} label="No assets registered." />}
                        {assets.data.map((a) => {
                            const overdue = a.next_calibration_date && a.next_calibration_date < today;
                            return (
                                <tr key={a.id} className="hover:bg-muted/40">
                                    <td className="px-4 py-3 font-mono text-xs">{a.code}</td>
                                    <td className="px-4 py-3">{a.name}</td>
                                    <td className="px-4 py-3 text-xs">{a.department?.name ?? '—'}</td>
                                    <td className="px-4 py-3 font-mono text-xs">
                                        <span className={overdue ? 'text-red-700 font-semibold' : ''}>{a.next_calibration_date ?? '—'}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="secondary">{a.status}</Badge>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </ModuleShell>
        </AppLayout>
    );
}
