import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Stepper, type Step } from '@/components/stepper';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import {
    AlertOctagon,
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    ClipboardCheck,
    Loader2,
    UserCog,
} from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';

interface Department { id: number; name: string }
interface UserOpt { id: number; name: string; department_id: number | null }

interface NcrPayload {
    id?: number;
    kind?: 'ncr' | 'car' | 'capa';
    source?: string;
    title?: string;
    problem_statement?: string;
    immediate_action?: string | null;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    department_id?: number | null;
    owner_id?: number | null;
    due_date?: string | null;
}

interface Props {
    trigger: ReactNode;
    departments: Department[];
    users: UserOpt[];
    item?: NcrPayload;
}

const KINDS = [
    { value: 'ncr',  label: 'NCR',  desc: 'Non-Conformance Report' },
    { value: 'car',  label: 'CAR',  desc: 'Corrective Action Request' },
    { value: 'capa', label: 'CAPA', desc: 'Corrective + Preventive Action' },
] as const;

const SOURCES = [
    { value: 'internal_audit',     label: 'Internal Audit' },
    { value: 'external_audit',     label: 'External Audit' },
    { value: 'customer_complaint', label: 'Customer Complaint' },
    { value: 'kpi_miss',           label: 'KPI Below Target' },
    { value: 'inspection',         label: 'Inspection / QC' },
    { value: 'employee_report',    label: 'Employee Report' },
    { value: 'other',              label: 'Other' },
] as const;

const SEVERITIES = [
    { value: 'low',      label: 'Low',      slaDays: 14, color: 'bg-emerald-500/15 text-emerald-700' },
    { value: 'medium',   label: 'Medium',   slaDays: 7,  color: 'bg-amber-500/15 text-amber-700' },
    { value: 'high',     label: 'High',     slaDays: 3,  color: 'bg-orange-500/15 text-orange-700' },
    { value: 'critical', label: 'Critical', slaDays: 1,  color: 'bg-red-600/15 text-red-700' },
] as const;

const STEPS: Step[] = [
    { key: 'identify', title: 'Identify',    description: 'Source · severity', icon: <AlertOctagon className="size-4" /> },
    { key: 'problem',  title: 'Problem',     description: 'Statement · containment', icon: <AlertTriangle className="size-4" /> },
    { key: 'assign',   title: 'Assign',      description: 'Owner · due date', icon: <UserCog className="size-4" /> },
    { key: 'review',   title: 'Review',      description: 'Confirm & submit', icon: <ClipboardCheck className="size-4" /> },
];

function todayPlus(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

export function NcrFormWizard({ trigger, departments, users, item }: Props) {
    const [open, setOpen]   = useState(false);
    const [step, setStep]   = useState(0);
    const [visited, setVis] = useState<Set<number>>(new Set([0]));

    const isEdit = !!item?.id;

    const { data, setData, post, put, processing, errors, reset, transform } = useForm<{
        kind: 'ncr' | 'car' | 'capa';
        source: string;
        title: string;
        problem_statement: string;
        immediate_action: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        department_id: string;
        owner_id: string;
        due_date: string;
        _method?: string;
    }>({
        kind: item?.kind ?? 'ncr',
        source: item?.source ?? 'internal_audit',
        title: item?.title ?? '',
        problem_statement: item?.problem_statement ?? '',
        immediate_action: item?.immediate_action ?? '',
        severity: item?.severity ?? 'medium',
        department_id: item?.department_id ? String(item.department_id) : '',
        owner_id: item?.owner_id ? String(item.owner_id) : '',
        due_date: item?.due_date ?? todayPlus(7),
        _method: isEdit ? 'put' : undefined,
    });

    // Auto-set due_date when severity changes (unless user already typed something custom)
    const slaFor = (sev: string) => SEVERITIES.find((s) => s.value === sev)?.slaDays ?? 7;
    useEffect(() => {
        if (!isEdit) setData('due_date', todayPlus(slaFor(data.severity)));
    }, [data.severity]); // eslint-disable-line react-hooks/exhaustive-deps

    // Filter users by selected department (when set)
    const filteredUsers = useMemo(() => {
        if (!data.department_id) return users;
        const id = Number(data.department_id);
        return users.filter((u) => u.department_id === id || !u.department_id);
    }, [data.department_id, users]);

    useEffect(() => {
        if (!open) {
            reset();
            setStep(0);
            setVis(new Set([0]));
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    transform((d) => ({
        ...d,
        department_id: d.department_id === '' ? null : Number(d.department_id),
        owner_id: Number(d.owner_id),
    }));

    // ---- step validation ----
    const stepErrors = (i: number): string[] => {
        const e: string[] = [];
        if (i === 0) {
            if (!data.title.trim()) e.push('Title is required.');
            if (!data.severity)     e.push('Severity is required.');
            if (!data.source)       e.push('Source is required.');
        }
        if (i === 1) {
            if (!data.problem_statement.trim()) e.push('Problem statement is required.');
            if (data.severity === 'critical' && !data.immediate_action.trim()) {
                e.push('Critical NCR requires containment / immediate action.');
            }
        }
        if (i === 2) {
            if (!data.owner_id) e.push('Owner is required.');
            if (!data.due_date) e.push('Due date is required.');
        }
        return e;
    };
    const currentErrors = stepErrors(step);

    const next = () => {
        if (currentErrors.length > 0) return;
        const n = Math.min(step + 1, STEPS.length - 1);
        setStep(n);
        setVis((prev) => new Set([...prev, n]));
    };
    const prev = () => setStep((s) => Math.max(0, s - 1));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const url  = isEdit ? `/ncr/${item!.id}` : '/ncr';
        const opts = { onSuccess: () => setOpen(false), preserveScroll: true };
        post(url, opts);
    };

    const selectedSev = SEVERITIES.find((s) => s.value === data.severity)!;
    const ownerName   = users.find((u) => u.id === Number(data.owner_id))?.name;
    const deptName    = departments.find((d) => d.id === Number(data.department_id))?.name;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger}
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isEdit ? 'Edit' : 'Open New'} {data.kind.toUpperCase()}
                    </DialogTitle>
                    <DialogDescription>
                        8D-style workflow — Identify · Containment · Assign · Submit
                    </DialogDescription>
                </DialogHeader>

                {/* Stepper */}
                <div className="mt-2 border-b pb-4">
                    <Stepper
                        steps={STEPS}
                        current={step}
                        visited={visited}
                        onJump={(i) => i <= step && setStep(i)}
                    />
                </div>

                <form onSubmit={submit} className="mt-4 grid gap-5">
                    {/* === STEP 1 : IDENTIFY === */}
                    {step === 0 && (
                        <div className="grid gap-5">
                            <div className="grid gap-1.5">
                                <Label>Kind</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {KINDS.map((k) => (
                                        <button
                                            key={k.value}
                                            type="button"
                                            onClick={() => setData('kind', k.value)}
                                            className={cn(
                                                'rounded-lg border p-3 text-left transition',
                                                data.kind === k.value
                                                    ? 'border-[#b91c1c] bg-[#b91c1c]/5 ring-2 ring-[#b91c1c]/30'
                                                    : 'border-input hover:border-muted-foreground/50',
                                            )}
                                        >
                                            <div className="text-sm font-bold">{k.label}</div>
                                            <div className="text-[11px] text-muted-foreground">{k.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="title">Short title *</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. Coating thickness deviation — Line 2"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label>Source *</Label>
                                    <Select value={data.source} onValueChange={(v) => setData('source', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {SOURCES.map((s) => (
                                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label>Severity *</Label>
                                    <div className="grid grid-cols-4 gap-1">
                                        {SEVERITIES.map((s) => (
                                            <button
                                                key={s.value}
                                                type="button"
                                                onClick={() => setData('severity', s.value)}
                                                className={cn(
                                                    'rounded-md border px-2 py-1.5 text-[11px] font-semibold uppercase transition',
                                                    data.severity === s.value
                                                        ? s.color + ' border-current ring-1 ring-current/30'
                                                        : 'border-input text-muted-foreground hover:bg-muted/50',
                                                )}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        SLA: <span className="font-semibold">{slaFor(data.severity)} day(s)</span> to close
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === STEP 2 : PROBLEM === */}
                    {step === 1 && (
                        <div className="grid gap-5">
                            <div className="grid gap-1.5">
                                <Label htmlFor="problem">Problem statement *</Label>
                                <Textarea
                                    id="problem"
                                    rows={5}
                                    placeholder="Describe what happened, where, when, who detected it. Be specific."
                                    value={data.problem_statement}
                                    onChange={(e) => setData('problem_statement', e.target.value)}
                                />
                            </div>

                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                                    <div className="flex-1">
                                        <Label htmlFor="containment" className="text-amber-700 dark:text-amber-400">
                                            Immediate action / Containment{' '}
                                            {data.severity === 'critical' && (
                                                <Badge className="ml-1 bg-red-600/15 text-red-700">Required</Badge>
                                            )}
                                        </Label>
                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                            Stop the impact spreading: quarantine, halt the line, segregate batch, notify customer…
                                        </p>
                                        <Textarea
                                            id="containment"
                                            rows={3}
                                            className="mt-2 bg-background"
                                            placeholder="What you did right now to prevent further damage."
                                            value={data.immediate_action}
                                            onChange={(e) => setData('immediate_action', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === STEP 3 : ASSIGN === */}
                    {step === 2 && (
                        <div className="grid gap-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label>Department</Label>
                                    <Select
                                        value={data.department_id}
                                        onValueChange={(v) => setData('department_id', v === '_none' ? '' : v)}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_none">— None —</SelectItem>
                                            {departments.map((d) => (
                                                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label>Owner (PIC) *</Label>
                                    <Select
                                        value={data.owner_id}
                                        onValueChange={(v) => setData('owner_id', v)}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Choose owner…" /></SelectTrigger>
                                        <SelectContent>
                                            {filteredUsers.map((u) => (
                                                <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[11px] text-muted-foreground">
                                        Filtered by department. Notification will be sent on save.
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="due_date">Due date *</Label>
                                    <Input
                                        id="due_date"
                                        type="date"
                                        value={data.due_date}
                                        onChange={(e) => setData('due_date', e.target.value)}
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Auto-set based on severity SLA. You can override.
                                    </p>
                                </div>
                                <div className="grid items-end">
                                    <div className="rounded-lg bg-muted/40 p-3 text-xs">
                                        <div className="font-semibold">Approval chain</div>
                                        <div className="mt-1 text-muted-foreground">
                                            {data.severity === 'critical'
                                                ? 'Supervisor → Manager → Director'
                                                : data.severity === 'high'
                                                ? 'Supervisor → Manager'
                                                : 'Supervisor only'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === STEP 4 : REVIEW === */}
                    {step === 3 && (
                        <div className="grid gap-3">
                            <div className="rounded-xl border bg-card p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                            {data.kind.toUpperCase()} · {SOURCES.find((s) => s.value === data.source)?.label}
                                        </div>
                                        <div className="text-base font-bold">{data.title || '(no title)'}</div>
                                    </div>
                                    <Badge className={selectedSev.color}>{selectedSev.label}</Badge>
                                </div>
                                <dl className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Owner</dt>
                                        <dd className="font-semibold">{ownerName ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Department</dt>
                                        <dd>{deptName ?? '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Due</dt>
                                        <dd className="font-mono">{data.due_date}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">SLA</dt>
                                        <dd className="font-mono">{slaFor(data.severity)} days</dd>
                                    </div>
                                </dl>
                                <div className="mt-3 border-t pt-3 text-sm">
                                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Problem statement</dt>
                                    <dd className="mt-1 whitespace-pre-line">{data.problem_statement || '—'}</dd>
                                </div>
                                {data.immediate_action && (
                                    <div className="mt-3 border-t pt-3 text-sm">
                                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Containment</dt>
                                        <dd className="mt-1 whitespace-pre-line">{data.immediate_action}</dd>
                                    </div>
                                )}
                            </div>

                            <p className="text-[11px] text-muted-foreground">
                                After saving you can continue with Root Cause Analysis, Corrective Action, and verification on the detail page.
                            </p>
                        </div>
                    )}

                    {/* errors per step */}
                    {currentErrors.length > 0 && step !== 3 && (
                        <ul className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-[12px] text-red-700">
                            {currentErrors.map((er) => (
                                <li key={er}>• {er}</li>
                            ))}
                        </ul>
                    )}

                    {/* server errors */}
                    {Object.keys(errors).length > 0 && (
                        <ul className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-[12px] text-red-700">
                            {Object.values(errors).map((er) => (
                                <li key={er as string}>• {er as string}</li>
                            ))}
                        </ul>
                    )}

                    {/* Footer nav */}
                    <div className="mt-2 flex items-center justify-between border-t pt-4">
                        <Button type="button" variant="ghost" onClick={prev} disabled={step === 0} className="gap-1.5">
                            <ArrowLeft className="size-4" /> Back
                        </Button>

                        <div className="text-xs text-muted-foreground">
                            Step {step + 1} of {STEPS.length}
                        </div>

                        {step < STEPS.length - 1 ? (
                            <Button
                                type="button"
                                onClick={next}
                                disabled={currentErrors.length > 0}
                                className="gap-1.5 bg-[#b91c1c] hover:bg-[#991b1b]"
                            >
                                Next <ArrowRight className="size-4" />
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                disabled={processing}
                                className="gap-1.5 bg-[#b91c1c] hover:bg-[#991b1b]"
                            >
                                {processing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                                {isEdit ? 'Save changes' : `Open ${data.kind.toUpperCase()}`}
                            </Button>
                        )}
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
