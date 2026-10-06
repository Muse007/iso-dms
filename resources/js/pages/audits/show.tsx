import { ActualAuditorDialog } from '@/components/actual-auditor-dialog';
import { AuditFindingFormDialog } from '@/components/audit-finding-form-dialog';
import {
    MobileBadge,
    MobileList,
    MobileListCard,
    MobileListEmpty,
    MobileMeta,
    mobileDate,
} from '@/components/mobile-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import {
    Calendar,
    FileDown,
    FileSpreadsheet,
    Mail,
    Plus,
    Settings2,
    User,
    UserCog,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface UserOpt { id: number; name: string; department_id: number | null }

interface Finding {
    id: number;
    reference: string | null;
    category: string;
    clause: string | null;
    description: string;
    status: string;
    due_date: string | null;
    owner?: { id: number; name: string } | null;
}

interface ProcessRow { proses: string; related_documents: string[] | string }

const toDocsList = (rd: string[] | string | null | undefined): string[] => {
    const arr = Array.isArray(rd) ? rd : (rd ? String(rd).split(/\r\n|\r|\n/) : []);
    return arr.map((x) => x.trim()).filter((x) => x !== '');
};
interface Audit {
    id: number;
    code: string;
    title: string;
    period_label: string | null;
    standard: string;
    standards: string[] | null;
    type: string;
    status: string;
    schedule?: { id: number; code: string; status: string } | null;
    location: string | null;
    scope: string | null;
    objectives: string | null;
    processes: ProcessRow[] | null;
    jam_pelaksanaan: string | null;
    planned_date: string;
    actual_start_date: string | null;
    actual_end_date: string | null;
    notified_at: string | null;
    // Eloquent men-serialisasi relasi ke snake_case ($snakeAttributes), jadi
    // relasi `leadAuditor` sampai di frontend sebagai `lead_auditor`.
    lead_auditor?: { id: number; name: string; email: string } | null;
    actual_lead_auditor?: { id: number; name: string; email: string } | null;
    auditor_changed_by?: { id: number; name: string } | null;
    actual_lead_auditor_id: number | null;
    actual_team: number[] | null;
    auditor_change_reason: string | null;
    auditor_changed_at: string | null;
    department?: { id: number; name: string } | null;
    auditees?: number[] | null;
    cc_user_ids?: number[] | null;
    team?: number[] | null;
    findings: Finding[];
    notifications: Array<{
        id: number;
        type: string;
        subject_line: string;
        recipients: string[];
        cc: string[] | null;
        status: string;
        created_at: string;
    }>;
}

interface Props {
    audit: Audit;
    team: UserOpt[];
    /** null = auditor aktual belum pernah dicatat, jadi masih mengikuti rencana. */
    actualTeam: UserOpt[] | null;
    users: UserOpt[];
    canAddFinding?: boolean;
    canEditActualAuditor?: boolean;
}

const categoryBadge: Record<string, string> = {
    opportunity: 'bg-emerald-100 text-emerald-700',
    minor_nc:    'bg-amber-100 text-amber-700',
    major_nc:    'bg-red-100 text-red-700',
    observation: 'bg-slate-100 text-slate-700',
};
/** Garis aksen kartu mobile, selaras dengan categoryBadge. */
const FINDING_ACCENT: Record<string, string> = {
    opportunity: '#10b981',
    minor_nc: '#f59e0b',
    major_nc: '#dc2626',
    observation: '#94a3b8',
};

const categoryLabel: Record<string, string> = {
    opportunity: 'PFI',
    minor_nc:    'Minor',
    major_nc:    'Major',
    observation: 'Obs',
};

const statusBadge: Record<string, string> = {
    open:                  'bg-slate-100 text-slate-700',
    in_progress:           'bg-blue-100 text-blue-700',
    waiting_approval:      'bg-amber-100 text-amber-700',
    waiting_verification:  'bg-amber-100 text-amber-700',
    closed:                'bg-emerald-100 text-emerald-700',
    rejected:              'bg-red-100 text-red-700',
};

export default function AuditShow({ audit, team, actualTeam, users, canAddFinding, canEditActualAuditor }: Props) {
    const [tab, setTab] = useState<'findings' | 'history' | 'notifications'>('findings');
    const [openFinding, setOpenFinding] = useState(false);
    const [openAuditor, setOpenAuditor] = useState(false);

    // Auditor pelaksana: pakai yang aktual bila sudah dicatat, selain itu rencana.
    const auditorChanged = audit.actual_lead_auditor_id !== null || audit.actual_team !== null;
    const effectiveLead = audit.actual_lead_auditor ?? audit.lead_auditor;
    const effectiveTeam = actualTeam ?? team;
    // Overdue baru berlaku SETELAH due date lewat — pada hari jatuh tempo temuan masih on-time.
    // Dibandingkan sebagai string 'YYYY-MM-DD' (format due_date dari server) agar tidak terpengaruh
    // zona waktu: `new Date('2026-08-06')` di-parse sebagai UTC tengah malam sehingga di WIB sudah
    // terhitung lewat sejak pukul 00:00 pada hari itu juga.
    const todayIso = new Date().toLocaleDateString('sv-SE'); // sv-SE ⇒ YYYY-MM-DD waktu lokal
    const isOverdue = (f: Finding) =>
        !!f.due_date && f.status !== 'closed' && f.status !== 'rejected' && f.due_date < todayIso;

    const counts = useMemo(() => ({
        pfi:   audit.findings.filter((f) => f.category === 'opportunity').length,
        minor: audit.findings.filter((f) => f.category === 'minor_nc').length,
        major: audit.findings.filter((f) => f.category === 'major_nc').length,
    }), [audit.findings]);

    return (
        <AppLayout breadcrumbs={[
            { title: 'Internal Audit', href: '/audits' },
            { title: audit.code, href: `/audits/${audit.id}` },
        ]}>
            <Head title={`${audit.code} · ${audit.title}`} />

            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground font-mono">{audit.code}</div>
                        <h1 className="text-2xl font-extrabold tracking-tight">{audit.title}</h1>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Badge className={statusBadge[audit.status] ?? ''}>{audit.status.replace('_', ' ')}</Badge>
                            {((audit.standards && audit.standards.length > 0) ? audit.standards : [audit.standard]).map((s) => (
                                <Badge key={s} variant="outline">{s.replace('_', ' ').toUpperCase()}</Badge>
                            ))}
                            <Badge variant="outline">{audit.type}</Badge>
                            {audit.notified_at && <Badge className="bg-blue-100 text-blue-700"><Mail className="size-3 mr-1" /> Notified</Badge>}
                        </div>
                        {audit.schedule && (
                            <div className="mt-1 text-xs">
                                <Link href={`/audit-schedules/${audit.schedule.id}`} className="text-[#b91c1c] hover:underline">
                                    Bagian dari jadwal {audit.schedule.code} →
                                </Link>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <TransitionMenu audit={audit} />
                        {audit.findings.length > 0 && (
                            <Button
                                asChild
                                variant="outline"
                                title="Export rekap temuan audit ini ke Excel (FM-BDK-009)"
                                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                            >
                                <a href={`/audits/export/findings?ids[]=${audit.id}`}>
                                    <FileSpreadsheet className="size-4" /> Export Excel
                                </a>
                            </Button>
                        )}
                        {canAddFinding && (
                            <Button onClick={() => setOpenFinding(true)} className="bg-[#b91c1c] hover:bg-[#7f1d1d]">
                                <Plus className="size-4" /> Tambah Temuan
                            </Button>
                        )}
                    </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Meta icon={Calendar} label="Tanggal Audit" value={audit.planned_date} />
                    <Meta icon={Calendar} label="Jam Pelaksanaan" value={audit.jam_pelaksanaan ?? '—'} />
                    <Meta icon={User} label="Lead Auditor" value={effectiveLead?.name ?? '—'} />
                    <Meta icon={User} label="Bagian / Departemen" value={audit.department?.name ?? '—'} />
                    <Meta icon={Settings2} label="Lokasi" value={audit.location ?? '—'} />
                    {audit.period_label && <Meta icon={Calendar} label="Periode" value={audit.period_label} />}
                </div>

                {/* Auditor pelaksana — rencana vs aktual. Perubahan dicatat Document Control
                    tanpa mengubah jadwal FM-BDK-007 yang sudah disetujui MR. */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <div className="text-xs font-semibold text-muted-foreground">Auditor Pelaksana</div>
                                {auditorChanged && (
                                    <Badge className="bg-amber-100 text-amber-700">
                                        <UserCog className="mr-1 size-3" /> Berbeda dari jadwal
                                    </Badge>
                                )}
                            </div>
                            {canEditActualAuditor && (
                                <Button variant="outline" size="sm" onClick={() => setOpenAuditor(true)}>
                                    <UserCog className="size-4" /> {auditorChanged ? 'Ubah Auditor Aktual' : 'Catat Auditor Aktual'}
                                </Button>
                            )}
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <AuditorSlot
                                label="Lead Auditor"
                                actual={effectiveLead?.name ?? '—'}
                                planned={audit.lead_auditor?.name ?? '—'}
                                changed={auditorChanged && audit.actual_lead_auditor_id !== null}
                            />
                            <AuditorSlot
                                label="Tim Auditor"
                                actual={effectiveTeam.length > 0 ? effectiveTeam.map((u) => u.name).join(', ') : '—'}
                                planned={team.length > 0 ? team.map((u) => u.name).join(', ') : '—'}
                                changed={auditorChanged && audit.actual_team !== null}
                            />
                        </div>

                        {auditorChanged && (
                            <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                <div className="font-semibold">Alasan perubahan</div>
                                <div className="mt-0.5 whitespace-pre-line">{audit.auditor_change_reason || '—'}</div>
                                <div className="mt-1 text-amber-700">
                                    Dicatat oleh {audit.auditor_changed_by?.name ?? '—'}
                                    {audit.auditor_changed_at ? ` · ${audit.auditor_changed_at}` : ''}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Proses & dokumen terkait — versi mobile */}
                {audit.processes && audit.processes.length > 0 && (
                    <div className="md:hidden">
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Proses & Dokumen Terkait
                        </div>
                        <MobileList>
                            {audit.processes.map((p, i) => (
                                <MobileListCard
                                    key={i}
                                    title={p.proses || '—'}
                                    footer={
                                        toDocsList(p.related_documents).length > 0 ? (
                                            <ul className="space-y-0.5">
                                                {toDocsList(p.related_documents).map((doc, di) => (
                                                    <li key={di} className="flex gap-1.5 text-[11px] text-muted-foreground">
                                                        <span className="text-muted-foreground/50">•</span>
                                                        <span className="min-w-0 break-words">{doc}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="text-[11px] text-muted-foreground">Tanpa dokumen terkait</span>
                                        )
                                    }
                                />
                            ))}
                        </MobileList>
                    </div>
                )}

                {audit.processes && audit.processes.length > 0 && (
                    <Card className="hidden md:block">
                        <CardContent className="overflow-x-auto p-0">
                            <table className="w-full text-sm">
                                <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Proses</th>
                                        <th className="px-4 py-2 text-left">Related Document</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {audit.processes.map((p, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-2 align-top font-medium">{p.proses || '—'}</td>
                                            <td className="px-4 py-2 align-top text-muted-foreground">
                                                {toDocsList(p.related_documents).length > 0 ? (
                                                    <ul className="list-disc pl-4">
                                                        {toDocsList(p.related_documents).map((doc, di) => <li key={di}>{doc}</li>)}
                                                    </ul>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}

                {audit.scope && (
                    <Card>
                        <CardContent className="p-4 text-sm">
                            <div className="text-xs font-semibold text-muted-foreground mb-1">Scope</div>
                            <p>{audit.scope}</p>
                            {audit.objectives && (
                                <>
                                    <div className="mt-3 text-xs font-semibold text-muted-foreground mb-1">Objektif</div>
                                    <p>{audit.objectives}</p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Tabs */}
                <div className="border-b text-sm">
                    {([
                        ['findings', `Temuan (${audit.findings.length})`],
                        ['notifications', `Notifikasi (${audit.notifications.length})`],
                        ['history', 'Tim & Auditee'],
                    ] as const).map(([k, label]) => (
                        <button
                            key={k}
                            onClick={() => setTab(k)}
                            className={`px-4 py-2 ${tab === k ? 'border-b-2 border-[#b91c1c] text-[#b91c1c] font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'findings' && (
                    <div className="md:hidden">
                        <MobileList>
                            {audit.findings.length === 0 && <MobileListEmpty message="Belum ada temuan." />}
                            {audit.findings.map((f) => {
                                const overdue = isOverdue(f);
                                return (
                                    <MobileListCard
                                        key={f.id}
                                        href={`/audits/${audit.id}/findings/${f.id}`}
                                        code={`${f.reference ?? `F-${f.id}`}${f.clause ? ` · Klausul ${f.clause}` : ''}`}
                                        title={f.description}
                                        accent={FINDING_ACCENT[f.category]}
                                        badges={
                                            <>
                                                <MobileBadge className={categoryBadge[f.category] ?? 'bg-slate-100 text-slate-700'}>
                                                    {categoryLabel[f.category] ?? f.category}
                                                </MobileBadge>
                                                {overdue ? (
                                                    <MobileBadge className="bg-red-600 text-white">OVERDUE</MobileBadge>
                                                ) : (
                                                    <MobileBadge className={statusBadge[f.status] ?? 'bg-slate-100 text-slate-700'}>
                                                        {f.status.replace(/_/g, ' ')}
                                                    </MobileBadge>
                                                )}
                                            </>
                                        }
                                        meta={
                                            <>
                                                <MobileMeta icon={User}>{f.owner?.name ?? '—'}</MobileMeta>
                                                <MobileMeta icon={Calendar}>
                                                    {f.due_date ? mobileDate(f.due_date) : 'Tanpa due date'}
                                                </MobileMeta>
                                            </>
                                        }
                                    />
                                );
                            })}
                        </MobileList>
                    </div>
                )}

                {tab === 'findings' && (
                    <Card className="hidden md:block">
                        <CardContent className="overflow-x-auto p-0">
                            <table className="w-full text-sm">
                                <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Ref</th>
                                        <th className="px-4 py-2 text-left">Kategori</th>
                                        <th className="px-4 py-2 text-left">Deskripsi</th>
                                        <th className="px-4 py-2 text-left">Klausul</th>
                                        <th className="px-4 py-2 text-left">PIC</th>
                                        <th className="px-4 py-2 text-left">Due</th>
                                        <th className="px-4 py-2 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {audit.findings.length === 0 && (
                                        <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Belum ada temuan.</td></tr>
                                    )}
                                    {audit.findings.map((f) => (
                                        <tr key={f.id} className="hover:bg-muted/40">
                                            <td className="px-4 py-2 font-mono text-xs">
                                                <Link href={`/audits/${audit.id}/findings/${f.id}`} className="text-[#b91c1c] hover:underline">
                                                    {f.reference ?? `F-${f.id}`}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-2"><Badge className={categoryBadge[f.category]}>{categoryLabel[f.category] ?? f.category}</Badge></td>
                                            <td className="px-4 py-2 max-w-md">{f.description}</td>
                                            <td className="px-4 py-2 font-mono text-xs">{f.clause ?? '—'}</td>
                                            <td className="px-4 py-2 text-xs">{f.owner?.name ?? '—'}</td>
                                            <td className="px-4 py-2 font-mono text-xs">{f.due_date ?? '—'}</td>
                                            <td className="px-4 py-2">
                                                {isOverdue(f)
                                                    ? <Badge className="bg-red-600 text-white ring-1 ring-red-300">OVERDUE</Badge>
                                                    : <Badge className={statusBadge[f.status]}>{f.status.replace(/_/g, ' ')}</Badge>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}

                {tab === 'notifications' && (
                    <div className="md:hidden">
                        <MobileList>
                            {audit.notifications.length === 0 && (
                                <MobileListEmpty message="Belum ada email terkirim." />
                            )}
                            {audit.notifications.map((n) => (
                                <MobileListCard
                                    key={n.id}
                                    code={n.type}
                                    title={n.subject_line}
                                    badges={
                                        <MobileBadge
                                            className={
                                                n.status === 'sent'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-red-100 text-red-700'
                                            }
                                        >
                                            {n.status}
                                        </MobileBadge>
                                    }
                                    meta={
                                        <>
                                            <MobileMeta icon={Calendar}>{mobileDate(n.created_at)}</MobileMeta>
                                            <MobileMeta icon={Mail}>
                                                {n.recipients.length} to · {(n.cc ?? []).length} cc
                                            </MobileMeta>
                                        </>
                                    }
                                />
                            ))}
                        </MobileList>
                    </div>
                )}

                {tab === 'notifications' && (
                    <Card className="hidden md:block">
                        <CardContent className="overflow-x-auto p-0">
                            <table className="w-full text-sm">
                                <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Waktu</th>
                                        <th className="px-4 py-2 text-left">Tipe</th>
                                        <th className="px-4 py-2 text-left">Subject</th>
                                        <th className="px-4 py-2 text-left">Penerima</th>
                                        <th className="px-4 py-2 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {audit.notifications.length === 0 && (
                                        <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Belum ada email terkirim.</td></tr>
                                    )}
                                    {audit.notifications.map((n) => (
                                        <tr key={n.id}>
                                            <td className="px-4 py-2 font-mono text-xs">{n.created_at}</td>
                                            <td className="px-4 py-2 text-xs">{n.type}</td>
                                            <td className="px-4 py-2">{n.subject_line}</td>
                                            <td className="px-4 py-2 text-xs">{n.recipients.length} to · {(n.cc ?? []).length} cc</td>
                                            <td className="px-4 py-2">
                                                <Badge className={n.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                                                    {n.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}

                {tab === 'history' && (
                    <div className="grid gap-3 md:grid-cols-2">
                        <Card>
                            <CardContent className="p-4">
                                <div className="mb-2 text-xs font-semibold text-muted-foreground">
                                    Tim Auditor {auditorChanged ? '(Sesuai Jadwal)' : ''}
                                </div>
                                {team.length === 0
                                    ? <div className="text-sm text-muted-foreground">—</div>
                                    : team.map((u) => <div key={u.id} className="py-1 text-sm">{u.name}</div>)
                                }
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="mb-2 text-xs font-semibold text-muted-foreground">Auditee (PIC)</div>
                                {!audit.auditees || audit.auditees.length === 0
                                    ? <div className="text-sm text-muted-foreground">—</div>
                                    : audit.auditees.map((id) => {
                                        const u = users.find((x) => x.id === id);
                                        return <div key={id} className="py-1 text-sm">{u?.name ?? `User #${id}`}</div>;
                                    })
                                }
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <AuditFindingFormDialog
                open={openFinding}
                onOpenChange={setOpenFinding}
                auditId={audit.id}
                users={users}
            />

            {canEditActualAuditor && (
                <ActualAuditorDialog
                    open={openAuditor}
                    onOpenChange={setOpenAuditor}
                    auditId={audit.id}
                    auditCode={audit.code}
                    plannedLeadName={audit.lead_auditor?.name ?? '—'}
                    plannedTeam={team}
                    actualLeadAuditorId={audit.actual_lead_auditor_id}
                    actualTeamIds={audit.actual_team}
                    reason={audit.auditor_change_reason}
                    users={users}
                />
            )}
        </AppLayout>
    );
}

/** Satu baris auditor: nilai pelaksana di atas, rencana sebagai pembanding bila berbeda. */
function AuditorSlot({ label, actual, planned, changed }: {
    label: string;
    actual: string;
    planned: string;
    changed: boolean;
}) {
    return (
        <div className="rounded border p-3">
            <div className="text-[11px] text-muted-foreground">{label}</div>
            <div className="mt-0.5 text-sm font-semibold">{actual}</div>
            {changed && actual !== planned && (
                <div className="mt-1 text-[11px] text-muted-foreground">
                    Sesuai jadwal: <span className="line-through">{planned}</span>
                </div>
            )}
        </div>
    );
}

function Meta({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
    return (
        <Card>
            <CardContent className="p-3">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Icon className="size-3.5" /> {label}
                </div>
                <div className="mt-0.5 text-sm font-semibold">{value}</div>
            </CardContent>
        </Card>
    );
}

function TransitionMenu({ audit }: { audit: Audit }) {
    const next: Record<string, string[]> = {
        planned:    ['scheduled', 'cancelled'],
        scheduled:  ['in_progress', 'cancelled'],
        in_progress:['reporting', 'cancelled'],
        reporting:  ['closed'],
    };
    const choices = next[audit.status] ?? [];
    if (choices.length === 0) return null;

    return (
        <div className="flex items-center gap-1">
            {choices.map((to) => (
                <Button
                    key={to}
                    variant="outline"
                    size="sm"
                    onClick={() => router.post(`/audits/${audit.id}/transition`, { to }, { preserveScroll: true })}
                >
                    → {to.replace('_', ' ')}
                </Button>
            ))}
        </div>
    );
}
