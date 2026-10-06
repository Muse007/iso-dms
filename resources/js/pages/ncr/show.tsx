import { NcrFormWizard } from '@/components/ncr-form-wizard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { useForm } from '@inertiajs/react';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Clock,
    Loader2,
    Pencil,
    Save,
    Send,
    Shield,
    Trash2,
    XCircle,
} from 'lucide-react';

interface Approval {
    id: number;
    level: number;
    role_required: string;
    status: string;
    approver?: { name: string };
    decided_at: string | null;
}

interface Ncr {
    id: number;
    code: string;
    title: string;
    kind: 'ncr' | 'car' | 'capa';
    source: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: string;
    problem_statement: string;
    immediate_action: string | null;
    root_cause: string | null;
    corrective_action: string | null;
    preventive_action: string | null;
    verification_result: string | null;
    department_id: number | null;
    owner_id: number | null;
    department?: { id: number; name: string };
    owner?: { name: string };
    // Relasi Eloquent di-serialisasi snake_case (`raisedBy` → `raised_by`).
    raised_by?: { name: string };
    due_date: string | null;
    closed_at: string | null;
    created_at: string;
    approvals: Approval[];
}

interface Department { id: number; name: string }
interface UserOpt { id: number; name: string; department_id: number | null }
interface Props { item: Ncr; departments: Department[]; users: UserOpt[] }

const severityColor: Record<string, string> = {
    low: 'bg-emerald-500/15 text-emerald-700',
    medium: 'bg-amber-500/15 text-amber-700',
    high: 'bg-orange-500/15 text-orange-700',
    critical: 'bg-red-600/15 text-red-700',
};

const statusColor: Record<string, string> = {
    open: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300',
    assigned: 'bg-blue-500/15 text-blue-700',
    in_progress: 'bg-amber-500/15 text-amber-700',
    verification: 'bg-violet-500/15 text-violet-700',
    closed_effective: 'bg-emerald-500/15 text-emerald-700',
    closed_ineffective: 'bg-red-600/15 text-red-700',
    rejected: 'bg-red-600/15 text-red-700',
};

const allowedTransitions: Record<string, { to: string; label: string; tone: 'primary' | 'success' | 'danger' | 'neutral' }[]> = {
    open: [
        { to: 'in_progress', label: 'Start work', tone: 'primary' },
        { to: 'rejected',    label: 'Reject',     tone: 'danger' },
    ],
    assigned: [
        { to: 'in_progress', label: 'Start work', tone: 'primary' },
        { to: 'rejected',    label: 'Reject',     tone: 'danger' },
    ],
    in_progress: [
        { to: 'verification', label: 'Submit for verification', tone: 'primary' },
    ],
    verification: [
        { to: 'closed_effective',   label: 'Close — Effective',   tone: 'success' },
        { to: 'closed_ineffective', label: 'Close — Ineffective', tone: 'danger' },
        { to: 'in_progress',        label: 'Back to In Progress', tone: 'neutral' },
    ],
    closed_ineffective: [
        { to: 'in_progress', label: 'Re-open', tone: 'neutral' },
    ],
};

function transition(id: number, to: string) {
    const comment = window.prompt(`Optional comment for "${to}":`) ?? '';
    router.post(
        `/ncr/${id}/transition`,
        { to, comment: comment || null },
        { preserveScroll: true },
    );
}

function destroyNcr(id: number, code: string) {
    if (!window.confirm(`Delete ${code}?`)) return;
    router.delete(`/ncr/${id}`);
}

export default function NcrShow({ item, departments, users }: Props) {
    const rcaForm = useForm({
        kind: item.kind,
        source: item.source,
        title: item.title,
        problem_statement: item.problem_statement,
        immediate_action: item.immediate_action ?? '',
        root_cause: item.root_cause ?? '',
        corrective_action: item.corrective_action ?? '',
        preventive_action: item.preventive_action ?? '',
        severity: item.severity,
        department_id: item.department_id,
        owner_id: item.owner_id,
        due_date: item.due_date,
        _method: 'put',
    });

    const saveRca = (e: React.FormEvent) => {
        e.preventDefault();
        rcaForm.post(`/ncr/${item.id}`, { preserveScroll: true });
    };

    const submitApproval = () => router.post(`/ncr/${item.id}/submit`, {}, { preserveScroll: true });

    const transitions = allowedTransitions[item.status] ?? [];
    const isClosed = item.status.startsWith('closed_');

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'NCR / CAR / CAPA', href: '/ncr' },
                { title: item.code, href: `/ncr/${item.id}` },
            ]}
        >
            <Head title={item.code} />

            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {item.kind.toUpperCase()} · {item.source.replace('_', ' ')}
                        </div>
                        <h1 className="text-2xl font-extrabold tracking-tight">{item.code}</h1>
                        <p className="text-sm text-muted-foreground">{item.title}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge className={severityColor[item.severity]} variant="secondary">{item.severity}</Badge>
                        <Badge className={statusColor[item.status]} variant="secondary">
                            {item.status.replace('_', ' ')}
                        </Badge>

                        <NcrFormWizard
                            departments={departments}
                            users={users}
                            item={{
                                id: item.id,
                                kind: item.kind,
                                source: item.source,
                                title: item.title,
                                problem_statement: item.problem_statement,
                                immediate_action: item.immediate_action,
                                severity: item.severity,
                                department_id: item.department_id,
                                owner_id: item.owner_id,
                                due_date: item.due_date,
                            }}
                            trigger={
                                <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="gap-1.5">
                                        <Pencil className="size-4" /> Edit
                                    </Button>
                                </DialogTrigger>
                            }
                        />

                        {item.approvals.length === 0 && !isClosed && (
                            <Button size="sm" onClick={submitApproval} className="gap-1.5 bg-[#b91c1c] hover:bg-[#991b1b]">
                                <Send className="size-4" /> Submit for approval
                            </Button>
                        )}

                        <Button size="sm" variant="ghost" onClick={() => destroyNcr(item.id, item.code)} className="gap-1.5 text-red-600 hover:bg-red-500/10 hover:text-red-700">
                            <Trash2 className="size-4" /> Delete
                        </Button>
                    </div>
                </div>

                {/* Workflow buttons */}
                {transitions.length > 0 && (
                    <Card>
                        <CardContent className="flex flex-wrap items-center gap-2 py-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Move forward
                            </span>
                            <ArrowRight className="size-4 text-muted-foreground" />
                            {transitions.map((t) => (
                                <Button
                                    key={t.to}
                                    size="sm"
                                    variant={t.tone === 'primary' ? 'default' : t.tone === 'success' ? 'default' : t.tone === 'danger' ? 'outline' : 'ghost'}
                                    className={
                                        t.tone === 'primary' ? 'bg-[#b91c1c] hover:bg-[#991b1b]' :
                                        t.tone === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                                        t.tone === 'danger'  ? 'border-red-500/40 text-red-700 hover:bg-red-500/10' :
                                        ''
                                    }
                                    onClick={() => transition(item.id, t.to)}
                                >
                                    {t.label}
                                </Button>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <div className="space-y-4 xl:col-span-2">
                        {/* Problem & Containment */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Problem &amp; Containment</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div>
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Problem statement
                                    </Label>
                                    <p className="mt-1 whitespace-pre-line">{item.problem_statement}</p>
                                </div>
                                {item.immediate_action && (
                                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                                        <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-700">
                                            <AlertTriangle className="size-3.5" /> Containment / Immediate action
                                        </Label>
                                        <p className="mt-1 whitespace-pre-line">{item.immediate_action}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Root cause + corrective + preventive (inline editor) */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Shield className="size-4" /> Root Cause &amp; Action Plan
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={saveRca} className="grid gap-4">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="root_cause">
                                            Root cause analysis
                                            <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                                                (5-Why · Fishbone · 8D D4)
                                            </span>
                                        </Label>
                                        <Textarea
                                            id="root_cause"
                                            rows={3}
                                            placeholder="Why did it happen? Drill down to the systemic cause."
                                            value={rcaForm.data.root_cause ?? ''}
                                            onChange={(e) => rcaForm.setData('root_cause', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="corrective_action">Corrective action (D5)</Label>
                                        <Textarea
                                            id="corrective_action"
                                            rows={3}
                                            placeholder="What will be done to eliminate the root cause?"
                                            value={rcaForm.data.corrective_action ?? ''}
                                            onChange={(e) => rcaForm.setData('corrective_action', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="preventive_action">Preventive action (D7)</Label>
                                        <Textarea
                                            id="preventive_action"
                                            rows={3}
                                            placeholder="System-wide change to prevent recurrence elsewhere."
                                            value={rcaForm.data.preventive_action ?? ''}
                                            onChange={(e) => rcaForm.setData('preventive_action', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={rcaForm.processing} size="sm" className="gap-1.5">
                                            {rcaForm.processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                            Save analysis
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Verification result history */}
                        {item.verification_result && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Verification log</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <pre className="whitespace-pre-line rounded-md bg-muted/40 p-3 text-xs">
                                        {item.verification_result}
                                    </pre>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-4">
                        {/* Metadata */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Owner</dt>
                                        <dd>{item.owner?.name ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Raised by</dt>
                                        <dd>{item.raised_by?.name ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Department</dt>
                                        <dd>{item.department?.name ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Due date</dt>
                                        <dd className="font-mono">{item.due_date ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Opened</dt>
                                        <dd className="font-mono text-xs">{item.created_at}</dd>
                                    </div>
                                    {item.closed_at && (
                                        <div>
                                            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Closed</dt>
                                            <dd className="font-mono text-xs">{item.closed_at}</dd>
                                        </div>
                                    )}
                                </dl>
                            </CardContent>
                        </Card>

                        {/* Approval trail */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Approval Trail</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {item.approvals.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Not yet submitted. Use <span className="font-semibold">Submit for approval</span> above.
                                    </p>
                                ) : (
                                    <ol className="space-y-3">
                                        {item.approvals.map((a) => (
                                            <li key={a.id} className="flex items-start gap-3">
                                                <div
                                                    className={`mt-0.5 flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                                                        a.status === 'approved'
                                                            ? 'bg-emerald-500'
                                                            : a.status === 'rejected'
                                                            ? 'bg-red-500'
                                                            : a.status === 'pending'
                                                            ? 'bg-amber-500'
                                                            : 'bg-zinc-400'
                                                    }`}
                                                >
                                                    {a.status === 'approved' ? (
                                                        <CheckCircle2 className="size-3" />
                                                    ) : a.status === 'rejected' ? (
                                                        <XCircle className="size-3" />
                                                    ) : (
                                                        <Clock className="size-3" />
                                                    )}
                                                </div>
                                                <div className="flex-1 text-sm">
                                                    <div className="font-semibold">L{a.level} · {a.role_required}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {a.approver?.name ?? '—'} · {a.status}
                                                        {a.decided_at && ` · ${a.decided_at}`}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
