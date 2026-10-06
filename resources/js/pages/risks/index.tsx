import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Building2, CircleDot, Plus, TriangleAlert, UserRound } from 'lucide-react';
import { MobileBadge, MobileList, MobileListCard, MobileListEmpty, MobileMeta } from '@/components/mobile-list';

interface Risk {
    id: number;
    code: string;
    title: string;
    category: string;
    severity: number;
    likelihood: number;
    score: number;
    level: string;
    status: string;
    department?: { name: string } | null;
    owner?: { name: string } | null;
}

interface Props {
    risks: { data: Risk[]; total: number };
    matrix: Record<number, Record<number, number>>;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Risk Register', href: '/risks' }];

const levelColor: Record<string, string> = {
    low: 'bg-emerald-500/15 text-emerald-700',
    medium: 'bg-amber-500/15 text-amber-700',
    high: 'bg-orange-500/15 text-orange-700',
    critical: 'bg-red-600/15 text-red-700',
};

function riskColor(s: number, l: number) {
    const v = s * l;
    if (v >= 15) return '#b91c1c';
    if (v >= 10) return '#f97316';
    if (v >= 5) return '#f59e0b';
    return '#10b981';
}

export default function RisksIndex({ risks, matrix }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Risk Register" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight">Risk Register</h1>
                        <p className="text-sm text-muted-foreground">ISO 31000 risk-based thinking — Severity × Likelihood</p>
                    </div>
                    <Button size="sm" className="gap-1.5 bg-[#b91c1c] hover:bg-[#991b1b]">
                        <Plus className="size-4" /> New Risk
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <Card className="xl:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-base">Risk Matrix</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <div className="flex flex-col-reverse justify-between py-1 text-[10px] font-semibold text-muted-foreground">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <span key={n}>{n}</span>
                                    ))}
                                </div>
                                <div className="flex-1">
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {[5, 4, 3, 2, 1].flatMap((sev) =>
                                            [1, 2, 3, 4, 5].map((lik) => {
                                                const count = matrix?.[sev]?.[lik] ?? 0;
                                                return (
                                                    <div
                                                        key={`${sev}-${lik}`}
                                                        className="flex aspect-square items-center justify-center rounded-md text-[11px] font-bold text-white"
                                                        style={{ background: riskColor(sev, lik), opacity: count === 0 ? 0.35 : 1 }}
                                                    >
                                                        {count > 0 ? count : ''}
                                                    </div>
                                                );
                                            }),
                                        )}
                                    </div>
                                    <div className="mt-1 grid grid-cols-5 text-center text-[10px] font-semibold text-muted-foreground">
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <span key={n}>{n}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Daftar versi mobile */}
                    <div className="md:hidden">
                        <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Semua Risiko ({risks.total})
                        </div>
                        <MobileList>
                            {risks.data.length === 0 && <MobileListEmpty message="Belum ada risiko teridentifikasi." />}
                            {risks.data.map((r) => (
                                <MobileListCard
                                    key={r.id}
                                    code={`${r.code} · ${r.category}`}
                                    title={r.title}
                                    accent={riskColor(r.severity, r.likelihood)}
                                    badges={
                                        <MobileBadge className={levelColor[r.level] ?? 'bg-slate-100 text-slate-700'}>
                                            {r.level}
                                        </MobileBadge>
                                    }
                                    meta={
                                        <>
                                            <MobileMeta icon={Building2}>{r.department?.name ?? '—'}</MobileMeta>
                                            <MobileMeta icon={UserRound}>{r.owner?.name ?? '—'}</MobileMeta>
                                            <MobileMeta icon={CircleDot}>{r.status}</MobileMeta>
                                        </>
                                    }
                                    footer={
                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                            <span>
                                                Severity {r.severity} × Likelihood {r.likelihood}
                                            </span>
                                            <span
                                                className="ml-auto rounded-full px-2 py-0.5 font-mono font-bold text-white"
                                                style={{ background: riskColor(r.severity, r.likelihood) }}
                                            >
                                                {r.score}
                                            </span>
                                        </div>
                                    }
                                />
                            ))}
                        </MobileList>
                    </div>

                    <Card className="hidden md:block xl:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base">All Risks ({risks.total})</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto p-0">
                            <table className="w-full text-sm">
                                <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Code</th>
                                        <th className="px-4 py-3 text-left font-semibold">Title</th>
                                        <th className="px-4 py-3 text-left font-semibold">Dept</th>
                                        <th className="px-4 py-3 text-left font-semibold">S × L</th>
                                        <th className="px-4 py-3 text-left font-semibold">Score</th>
                                        <th className="px-4 py-3 text-left font-semibold">Level</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {risks.data.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                                                <TriangleAlert className="mx-auto size-10 text-muted-foreground/40" />
                                                <p className="mt-2">No risks identified.</p>
                                            </td>
                                        </tr>
                                    )}
                                    {risks.data.map((r) => (
                                        <tr key={r.id} className="hover:bg-muted/40">
                                            <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                                            <td className="px-4 py-3">{r.title}</td>
                                            <td className="px-4 py-3 text-xs">{r.department?.name ?? '—'}</td>
                                            <td className="px-4 py-3 font-mono text-xs">{r.severity} × {r.likelihood}</td>
                                            <td className="px-4 py-3 font-mono font-bold">{r.score}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="secondary" className={levelColor[r.level]}>
                                                    {r.level}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
