import { DocumentFormDialog, type ApproverUser, type DocumentRecord } from '@/components/document-form-dialog';
import { ArchiveUploadDialog } from '@/components/archive-upload-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Archive, Building2, ChevronDown, Eye, FileText, FilePlus, Filter, MoreHorizontal, Pencil, Plus, Search, Trash2, UserRound } from 'lucide-react';
import { MobileBadge, MobileList, MobileListCard, MobileListEmpty, MobileMeta } from '@/components/mobile-list';
import { useState } from 'react';

interface Doc extends DocumentRecord {
    id: number;
    code: string;
    title: string;
    type: string;
    standard: string;
    standards: string[] | null;
    status: string;
    current_revision: string;
    effective_date: string | null;
    next_review_date: string | null;
    department?: { id: number; name: string } | null;
    owner?: { name: string } | null;
    description: string | null;
    department_id: number | null;
    updated_at: string;
}

interface Department { id: number; name: string }

interface Props {
    documents: { data: Doc[]; current_page: number; last_page: number; total: number };
    filters: { q?: string; type?: string; status?: string; department?: string };
    departments: Department[];
    users: ApproverUser[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Document Control', href: '/documents' }];

const DOC_TYPE_LABEL: Record<string, string> = {
    policy: 'Kebijakan Perusahaan',
    anti_bribery: 'Kebijakan Anti Suap',
    sop: 'Prosedur',
    work_instruction: 'Instruksi Kerja',
    form: 'Form',
    record: 'Record',
    manual: 'Manual',
    other: 'Other',
};

const statusColor: Record<string, string> = {
    draft: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300',
    in_review: 'bg-amber-500/15 text-amber-700',
    approved: 'bg-emerald-500/15 text-emerald-700',
    published: 'bg-emerald-500/15 text-emerald-700',
    obsolete: 'bg-zinc-500/15 text-zinc-500',
    rejected: 'bg-red-600/15 text-red-700',
    withdrawn: 'bg-zinc-500/15 text-zinc-500',
};

function destroyDoc(d: Doc) {
    if (!window.confirm(`Delete ${d.code}? This is a soft delete and can be restored from DB.`)) return;
    router.delete(`/documents/${d.id}`, { preserveScroll: true });
}

export default function DocumentsIndex({ documents, filters, departments, users }: Props) {
    const [q, setQ] = useState(filters.q ?? '');
    const { auth } = usePage<SharedData>().props;
    const canArchive = (auth.roles ?? []).some((r) => r === 'document_control' || r === 'super_admin');
    const [requestOpen, setRequestOpen] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [showFilter, setShowFilter] = useState(
        !!(filters.type || filters.status || filters.department),
    );

    // Apply the current search + filters; `patch` overrides individual keys.
    const apply = (patch: Partial<{ q: string; type: string; status: string; department: string }> = {}) => {
        const params = {
            q,
            type: filters.type ?? '',
            status: filters.status ?? '',
            department: filters.department ?? '',
            ...patch,
        };
        // Drop empty params so the URL stays clean.
        const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));
        router.get('/documents', clean, { preserveState: true, replace: true });
    };

    const search = (e: React.FormEvent) => {
        e.preventDefault();
        apply();
    };

    const resetFilters = () => {
        setQ('');
        router.get('/documents', {}, { preserveState: true, replace: true });
    };

    const hasActiveFilter = !!(filters.type || filters.status || filters.department);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Document Control" />

            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight">Document Control</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage Prosedur, Work Instruction, and quality records with full revision control.
                        </p>
                    </div>
                    {/* flex-wrap + input elastis: tanpa ini baris aksi (input 256px
                        + 2 tombol) melebihi lebar layar HP dan memaksa halaman
                        bisa digeser horizontal. */}
                    <div className="flex flex-wrap items-center gap-2">
                        <form onSubmit={search} className="relative w-full min-w-0 sm:w-auto">
                            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input
                                className="h-9 w-full pl-9 sm:w-64"
                                placeholder="Search code or title..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                        </form>
                        <Button
                            variant={hasActiveFilter ? 'default' : 'outline'}
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setShowFilter((s) => !s)}
                        >
                            <Filter className="size-4" /> Filter{hasActiveFilter ? ' •' : ''}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" className="gap-1.5 bg-[#b91c1c] hover:bg-[#991b1b]">
                                    <Plus className="size-4" /> New Document <ChevronDown className="size-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuItem
                                    className="gap-2"
                                    onSelect={(e) => { e.preventDefault(); setRequestOpen(true); }}
                                >
                                    <FilePlus className="size-4" />
                                    <div>
                                        <div className="font-medium">Request new document</div>
                                        <div className="text-[11px] text-muted-foreground">Wajib melalui approval</div>
                                    </div>
                                </DropdownMenuItem>
                                {canArchive && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="gap-2"
                                            onSelect={(e) => { e.preventDefault(); setArchiveOpen(true); }}
                                        >
                                            <Archive className="size-4" />
                                            <div>
                                                <div className="font-medium">Upload arsip document</div>
                                                <div className="text-[11px] text-muted-foreground">Tanpa approval · DC &amp; Admin</div>
                                            </div>
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DocumentFormDialog
                            departments={departments}
                            users={users}
                            open={requestOpen}
                            onOpenChange={setRequestOpen}
                        />
                        {canArchive && (
                            <ArchiveUploadDialog
                                departments={departments}
                                open={archiveOpen}
                                onOpenChange={setArchiveOpen}
                            />
                        )}
                    </div>
                </div>

                {showFilter && (
                    <Card>
                        <CardContent className="flex flex-wrap items-end gap-3 p-4">
                            <div className="grid gap-1">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</label>
                                <select
                                    value={filters.type ?? ''}
                                    onChange={(e) => apply({ type: e.target.value })}
                                    className="h-9 w-44 rounded border border-input bg-background px-2 text-sm"
                                >
                                    <option value="">Semua type</option>
                                    {Object.entries(DOC_TYPE_LABEL).map(([v, l]) => (
                                        <option key={v} value={v}>{l}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-1">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
                                <select
                                    value={filters.status ?? ''}
                                    onChange={(e) => apply({ status: e.target.value })}
                                    className="h-9 w-44 rounded border border-input bg-background px-2 text-sm"
                                >
                                    <option value="">Semua status</option>
                                    {Object.keys(statusColor).map((s) => (
                                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-1">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Department</label>
                                <select
                                    value={filters.department ?? ''}
                                    onChange={(e) => apply({ department: e.target.value })}
                                    className="h-9 w-44 rounded border border-input bg-background px-2 text-sm"
                                >
                                    <option value="">Semua department</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={String(d.id)}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            {hasActiveFilter && (
                                <Button variant="ghost" size="sm" className="text-red-600" onClick={resetFilters}>
                                    Reset
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Daftar versi mobile */}
                <div className="md:hidden">
                    <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {documents.total} dokumen
                    </div>
                    <MobileList>
                        {documents.data.length === 0 && (
                            <MobileListEmpty message="Belum ada dokumen. Ketuk “New Document” untuk memulai." />
                        )}
                        {documents.data.map((d) => (
                            <MobileListCard
                                key={d.id}
                                href={`/documents/${d.id}`}
                                code={`${d.code} · Rev ${d.current_revision}`}
                                title={d.title}
                                badges={
                                    <MobileBadge className={statusColor[d.status] ?? 'bg-slate-100 text-slate-700'}>
                                        {d.status}
                                    </MobileBadge>
                                }
                                meta={
                                    <>
                                        <MobileMeta icon={FileText}>{DOC_TYPE_LABEL[d.type] ?? d.type}</MobileMeta>
                                        <MobileMeta icon={Building2}>{d.department?.name ?? '—'}</MobileMeta>
                                        <MobileMeta icon={UserRound}>{d.owner?.name ?? '—'}</MobileMeta>
                                    </>
                                }
                                footer={
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                        {((d.standards && d.standards.length > 0) ? d.standards : [d.standard])
                                            .map((s) => s.replace('_', ' '))
                                            .join(' · ')}
                                    </div>
                                }
                            />
                        ))}
                    </MobileList>
                </div>

                {/* Tabel versi desktop */}
                <Card className="hidden md:block">
                    <CardHeader className="pb-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {documents.total} documents
                        </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto p-0">
                        <table className="w-full text-sm">
                            <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Document</th>
                                    <th className="px-4 py-3 text-left font-semibold">Type · Standard</th>
                                    <th className="px-4 py-3 text-left font-semibold">Department</th>
                                    <th className="px-4 py-3 text-left font-semibold">Owner</th>
                                    <th className="px-4 py-3 text-left font-semibold">Rev</th>
                                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {documents.data.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                                            <FileText className="mx-auto size-10 text-muted-foreground/40" />
                                            <p className="mt-2">No documents yet — click <span className="font-semibold">New Document</span> to start.</p>
                                        </td>
                                    </tr>
                                )}
                                {documents.data.map((d) => (
                                    <tr key={d.id} className="hover:bg-muted/40">
                                        <td className="px-4 py-3">
                                            <Link href={`/documents/${d.id}`} className="font-semibold hover:text-[#b91c1c]">
                                                {d.code}
                                            </Link>
                                            <div className="text-xs text-muted-foreground">{d.title}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="secondary" className="font-mono text-[10px]">{DOC_TYPE_LABEL[d.type] ?? d.type}</Badge>
                                            <div className="mt-0.5 text-[11px] uppercase text-muted-foreground">
                                                {((d.standards && d.standards.length > 0) ? d.standards : [d.standard])
                                                    .map((s) => s.replace('_', ' '))
                                                    .join(' · ')}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs">{d.department?.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-xs">{d.owner?.name ?? '—'}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{d.current_revision}</td>
                                        <td className="px-4 py-3">
                                            <Badge className={statusColor[d.status] ?? ''} variant="secondary">
                                                {d.status}
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
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/documents/${d.id}`} className="flex items-center gap-2">
                                                            <Eye className="size-4" /> View
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DocumentFormDialog
                                                        document={{
                                                            id: d.id,
                                                            code: d.code,
                                                            title: d.title,
                                                            type: d.type,
                                                            standard: d.standard,
                                                            standards: d.standards,
                                                            department_id: d.department?.id ?? null,
                                                            description: d.description,
                                                            effective_date: d.effective_date,
                                                            next_review_date: d.next_review_date,
                                                            current_revision: d.current_revision,
                                                        }}
                                                        departments={departments}
                                                        users={users}
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
                                                        onClick={() => destroyDoc(d)}
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
