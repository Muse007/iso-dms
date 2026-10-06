import { EmptyRow, ModuleShell } from '@/components/module-shell';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';

interface T { id: number; code: string; title: string; type: string; scheduled_date: string; status: string; department?: { name: string } }
interface Props { trainings: { data: T[]; total: number } }

export default function TrainingsIndex({ trainings }: Props) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Trainings', href: '/trainings' }]}>
            <Head title="Training Management" />
            <ModuleShell title="Training Management" subtitle="Plan · Execute · Evaluate · Update competency matrix">
                <table className="w-full text-sm">
                    <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold">Code</th>
                            <th className="px-4 py-3 text-left font-semibold">Title</th>
                            <th className="px-4 py-3 text-left font-semibold">Type</th>
                            <th className="px-4 py-3 text-left font-semibold">Department</th>
                            <th className="px-4 py-3 text-left font-semibold">Scheduled</th>
                            <th className="px-4 py-3 text-left font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {trainings.data.length === 0 && <EmptyRow cols={6} label="No trainings planned." />}
                        {trainings.data.map((t) => (
                            <tr key={t.id} className="hover:bg-muted/40">
                                <td className="px-4 py-3 font-mono text-xs">{t.code}</td>
                                <td className="px-4 py-3">{t.title}</td>
                                <td className="px-4 py-3 text-xs uppercase">{t.type}</td>
                                <td className="px-4 py-3 text-xs">{t.department?.name ?? '—'}</td>
                                <td className="px-4 py-3 font-mono text-xs">{t.scheduled_date}</td>
                                <td className="px-4 py-3 text-xs">{t.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ModuleShell>
        </AppLayout>
    );
}
