import { MobileBadge, MobileList, MobileListCard, MobileListEmpty, MobileMeta } from '@/components/mobile-list';
import { EmptyRow, ModuleShell } from '@/components/module-shell';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Building2, Target } from 'lucide-react';

interface K { id: number; code: string; name: string; target: number; unit: string; frequency: string; department?: { name: string } }
interface Props { kpis: { data: K[]; total: number } }

export default function KpisIndex({ kpis }: Props) {
    return (
        <AppLayout breadcrumbs={[{ title: 'KPI Monitoring', href: '/kpis' }]}>
            <Head title="KPI Monitoring" />

            {/* Daftar versi mobile — tabel 5 kolom tidak terbaca di layar sempit */}
            <div className="flex flex-col gap-4 p-4 md:hidden">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">KPI Monitoring</h1>
                    <p className="text-sm text-muted-foreground">
                        Definisi per departemen · capaian vs target
                    </p>
                </div>
                <MobileList>
                    {kpis.data.length === 0 && <MobileListEmpty message="Belum ada KPI terdefinisi." />}
                    {kpis.data.map((k) => (
                        <MobileListCard
                            key={k.id}
                            code={k.code}
                            title={k.name}
                            badges={<MobileBadge className="bg-slate-100 text-slate-700">{k.frequency}</MobileBadge>}
                            meta={
                                <>
                                    <MobileMeta icon={Building2}>{k.department?.name ?? '—'}</MobileMeta>
                                    <MobileMeta icon={Target}>
                                        Target {k.target}
                                        {k.unit}
                                    </MobileMeta>
                                </>
                            }
                        />
                    ))}
                </MobileList>
            </div>

            <div className="hidden md:block">
            <ModuleShell title="KPI Monitoring" subtitle="Definitions per department · achievement vs target">
                <table className="w-full text-sm">
                    <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold">Code</th>
                            <th className="px-4 py-3 text-left font-semibold">Name</th>
                            <th className="px-4 py-3 text-left font-semibold">Department</th>
                            <th className="px-4 py-3 text-left font-semibold">Target</th>
                            <th className="px-4 py-3 text-left font-semibold">Frequency</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {kpis.data.length === 0 && <EmptyRow cols={5} label="No KPI defined." />}
                        {kpis.data.map((k) => (
                            <tr key={k.id} className="hover:bg-muted/40">
                                <td className="px-4 py-3 font-mono text-xs">{k.code}</td>
                                <td className="px-4 py-3">{k.name}</td>
                                <td className="px-4 py-3 text-xs">{k.department?.name ?? '—'}</td>
                                <td className="px-4 py-3 font-mono">{k.target}{k.unit}</td>
                                <td className="px-4 py-3"><Badge variant="secondary">{k.frequency}</Badge></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ModuleShell>
            </div>
        </AppLayout>
    );
}
