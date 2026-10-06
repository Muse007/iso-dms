import { NcrFormWizard } from '@/components/ncr-form-wizard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogTrigger } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertOctagon, CalendarDays, CheckCircle2, CircleDot, Eye, MoreHorizontal, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { MobileBadge, MobileList, MobileListCard, MobileListEmpty, MobileMeta, mobileDate } from '@/components/mobile-list';

interface Item {
    id: number;
    code: string;
    title: string;
    kind: 'ncr' | 'car' | 'capa';
    source?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: string;
    problem_statement?: string;
    immediate_action?: string | null;
    department_id: number | null;
    owner_id: number | null;
    owner?: { name: string } | null;
    due_date: string | null;
}

interface Department { id: number; name: string }
interface UserOpt { id: number; name: string; department_id: number | null }

interface Props {
    items: { data: Item[]; total: number };
    board: { open: Item[]; in_progress: Item[]; verification: Item[]; closed: Item[] };
    departments: Department[];
    users: UserOpt[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'NCR / CAR / CAPA', href: '/ncr' }];

/** Warna garis aksen kartu mobile, selaras dengan severityColor. */
const SEVERITY_ACCENT: Record<string, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#dc2626',
};

const severityColor: Record<string, string> = {
    low: 'bg-emerald-500/15 text-emerald-700',
    medium: 'bg-amber-500/15 text-amber-700',
    high: 'bg-orange-500/15 text-orange-700',
    critical: 'bg-red-600/15 text-red-700',
};

const colMeta: Record<string, { label: string; color: string }> = {
    open:         { label: 'Open',         color: '#dc2626' },
    in_progress:  { label: 'In Progress',  color: '#f97316' },
    verification: { label: 'Verification', color: '#3b82f6' },
    closed:       { label: 'Closed',       color: '#10b981' },
};

function CapaCard({ item }: { item: Item }) {
    return (
        <Link
            href={`/ncr/${item.id}`}
            className="block rounded-lg border bg-card p-3 shadow-sm transition hover:shadow-md hover:border-[#b91c1c]/40"
        >
            <div className="text-[11px] text-muted-foreground">{item.code}</div>
            <div className="mt-0.5 text-sm font-semibold">{item.title}</div>
            <div className="mt-2 flex items-center justify-between">
                <Badge variant="secondary" className={`${severityColor[item.severity]} text-[10px]`}>
                    {item.severity}
                </Badge>
                {item.status.startsWith('closed') ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                ) : (
                    <span className="text-[10px] text-muted-foreground">
                        {item.owner?.name?.split(' ')[0] ?? '—'}
                    </span>
                )}
            </div>
        </Link>
    );
}

function destroyNcr(id: number, code: string) {
    if (!window.confirm(`Delete ${code}?`)) return;
    router.delete(`/ncr/${id}`, { preserveScroll: true });
}

export default function NcrIndex({ items, board, departments, users }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="NCR / CAR / CAPA" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight">NCR / CAR / CAPA</h1>
                        <p className="text-sm text-muted-foreground">
                            8D workflow — Identify · Containment · Root cause · Action · Verify
                        </p>
                    </div>
                    <NcrFormWizard
                        departments={departments}
                        users={users}
                        trigger={
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-1.5 bg-[#b91c1c] hover:bg-[#991b1b]">
                                    <Plus className="size-4" /> Open NCR
                                </Button>
                            </DialogTrigger>
                        }
                    />
                </div>

                {/* Kanban */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">CAPA Workflow Board</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {(['open', 'in_progress', 'verification', 'closed'] as const).map((col) => (
                                <div key={col} className="rounded-xl bg-muted/40 p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-semibold">
                                            <span className="size-2 rounded-full" style={{ background: colMeta[col].color }} />
                                            {colMeta[col].label}
                                        </div>
                                        <span className="font-mono text-[11px] text-muted-foreground">
                                            {board[col].length}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {board[col].length === 0 ? (
                                            <div className="rounded-lg border border-dashed py-6 text-center text-[11px] text-muted-foreground">
                                                Empty
                                            </div>
                                        ) : (
                                            board[col].map((item) => <CapaCard key={item.id} item={item} />)
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Daftar versi mobile */}
                <div className="md:hidden">
                    <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Semua Item ({items.total})
                    </div>
                    <MobileList>
                        {items.data.length === 0 && (
                            <MobileListEmpty message="Belum ada NCR/CAPA. Ketuk “Open NCR” untuk memulai wizard 8D." />
                        )}
                        {items.data.map((it) => (
                            <MobileListCard
                                key={it.id}
                                href={`/ncr/${it.id}`}
                                code={`${it.code} · ${it.kind.toUpperCase()}`}
                                title={it.title}
                                accent={SEVERITY_ACCENT[it.severity]}
                                badges={
                                    <MobileBadge className={severityColor[it.severity] ?? 'bg-slate-100 text-slate-700'}>
                                        {it.severity}
                                    </MobileBadge>
                                }
                                meta={
                                    <>
                                        <MobileMeta icon={UserRound}>{it.owner?.name ?? '—'}</MobileMeta>
                                        <MobileMeta icon={CalendarDays}>{it.due_date ? mobileDate(it.due_date) : 'Tanpa due date'}</MobileMeta>
                                        <MobileMeta icon={CircleDot}>{it.status}</MobileMeta>
                                    </>
                                }
                            />
                        ))}
                    </MobileList>
                </div>

                {/* Tabel versi desktop */}
                <Card className="hidden md:block">
                    <CardHeader>
                        <CardTitle className="text-base">All Items ({items.total})</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto p-0">
                        <table className="w-full text-sm">
                            <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Code</th>
                                    <th className="px-4 py-3 text-left font-semibold">Title</th>
                                    <th className="px-4 py-3 text-left font-semibold">Kind</th>
                                    <th className="px-4 py-3 text-left font-semibold">Severity</th>
                                    <th className="px-4 py-3 text-left font-semibold">Owner</th>
                                    <th className="px-4 py-3 text-left font-semibold">Due</th>
                                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {items.data.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                                            <AlertOctagon className="mx-auto size-10 text-muted-foreground/40" />
                                            <p className="mt-2">No NCR/CAPA yet — click <span className="font-semibold">Open NCR</span> to start the 8D wizard.</p>
                                        </td>
                                    </tr>
                                )}
                                {items.data.map((it) => (
                                    <tr key={it.id} className="hover:bg-muted/40">
                                        <td className="px-4 py-3">
                                            <Link href={`/ncr/${it.id}`} className="font-semibold hover:text-[#b91c1c]">
                                                {it.code}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">{it.title}</td>
                                        <td className="px-4 py-3 font-mono text-xs uppercase">{it.kind}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant="secondary" className={severityColor[it.severity]}>
                                                {it.severity}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-xs">{it.owner?.name ?? '—'}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{mobileDate(it.due_date)}</td>
                                        <td className="px-4 py-3 text-xs">{it.status}</td>
                                        <td className="px-4 py-3 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7">
                                                        <MoreHorizontal className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/ncr/${it.id}`} className="flex items-center gap-2">
                                                            <Eye className="size-4" /> View
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <NcrFormWizard
                                                        departments={departments}
                                                        users={users}
                                                        item={{
                                                            id: it.id,
                                                            kind: it.kind,
                                                            source: it.source,
                                                            title: it.title,
                                                            problem_statement: it.problem_statement,
                                                            immediate_action: it.immediate_action,
                                                            severity: it.severity,
                                                            department_id: it.department_id,
                                                            owner_id: it.owner_id,
                                                            due_date: it.due_date,
                                                        }}
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
                                                        onClick={() => destroyNcr(it.id, it.code)}
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
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
