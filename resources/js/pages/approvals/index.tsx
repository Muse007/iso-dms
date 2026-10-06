import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CalendarCheck, CheckCircle2, Clock, ExternalLink, FileText, Layers, RotateCcw, Search, TriangleAlert, XCircle } from 'lucide-react';
import { MobileBadge, MobileList, MobileListCard, MobileListEmpty, MobileMeta, mobileDate } from '@/components/mobile-list';
import { useState } from 'react';

type Kind = 'document' | 'audit_schedule' | 'audit_finding';

interface QueueItem {
    kind: Kind;
    is_document: boolean;
    code: string;
    title?: string | null;
    type_label: string;
    context: string;
    url?: string | null;
    created_at?: string | null;
    // document-only (inline actions)
    approval_id?: number;
    level?: number;
    role_required?: string;
    doc_id?: number;
    doc_kind?: string | null;
}

interface Props {
    queue: QueueItem[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Approval Queue', href: '/approvals' }];

const typeBadge: Record<Kind, string> = {
    document: 'bg-slate-500/15 text-slate-700',
    audit_schedule: 'bg-blue-500/15 text-blue-700',
    audit_finding: 'bg-amber-500/15 text-amber-700',
};

const typeIcon: Record<Kind, typeof FileText> = {
    document: FileText,
    audit_schedule: CalendarCheck,
    audit_finding: TriangleAlert,
};

export default function ApprovalsIndex({ queue }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Approval Queue" />
            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">Approval Queue</h1>
                    <p className="text-sm text-muted-foreground">
                        Semua approval yang menunggu Anda — Dokumen, Jadwal Audit (MR), &amp; Temuan Audit — dalam satu antrean.
                    </p>
                </div>

                {/* Antrean versi mobile — aksi review tetap tersedia penuh */}
                <div className="md:hidden">
                    <MobileList>
                        {queue.length === 0 && (
                            <MobileListEmpty message="Inbox zero — tidak ada approval yang menunggu Anda." />
                        )}
                        {queue.map((it, i) => {
                            const Icon = typeIcon[it.kind];
                            return (
                                <MobileListCard
                                    key={`m-${it.kind}-${it.approval_id ?? it.code}-${i}`}
                                    code={it.code}
                                    title={it.title ?? it.type_label}
                                    badges={
                                        <MobileBadge className={typeBadge[it.kind]}>
                                            <Icon className="mr-1 size-3" />
                                            {it.type_label}
                                        </MobileBadge>
                                    }
                                    meta={
                                        <>
                                            <MobileMeta icon={Layers}>{it.context}</MobileMeta>
                                            <MobileMeta icon={Clock}>{mobileDate(it.created_at)}</MobileMeta>
                                        </>
                                    }
                                    footer={
                                        it.is_document ? (
                                            <ReviewDialog item={it} fullWidth />
                                        ) : (
                                            <Button asChild size="sm" variant="outline" className="h-9 w-full gap-1">
                                                <a href={it.url ?? '#'}>
                                                    <ExternalLink className="size-3.5" /> Buka untuk Review
                                                </a>
                                            </Button>
                                        )
                                    }
                                />
                            );
                        })}
                    </MobileList>
                </div>

                {/* Tabel versi desktop */}
                <Card className="hidden md:block">
                    <CardContent className="overflow-x-auto p-0">
                        <table className="w-full text-sm">
                            <thead className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Item</th>
                                    <th className="px-4 py-3 text-left font-semibold">Jenis</th>
                                    <th className="px-4 py-3 text-left font-semibold">Konteks</th>
                                    <th className="px-4 py-3 text-left font-semibold">Diminta</th>
                                    <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {queue.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                            <CheckCircle2 className="mx-auto size-10 text-muted-foreground/40" />
                                            <p className="mt-2">Inbox zero — tidak ada approval yang menunggu Anda.</p>
                                        </td>
                                    </tr>
                                )}
                                {queue.map((it, i) => {
                                    const Icon = typeIcon[it.kind];
                                    return (
                                        <tr key={`${it.kind}-${it.approval_id ?? it.code}-${i}`} className="hover:bg-muted/40">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold">{it.code}</div>
                                                {it.title && <div className="text-xs text-muted-foreground">{it.title}</div>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="secondary" className={`gap-1 ${typeBadge[it.kind]}`}>
                                                    <Icon className="size-3" /> {it.type_label}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs">{it.context}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">{it.created_at ?? '—'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end">
                                                    {it.is_document ? (
                                                        <ReviewDialog item={it} />
                                                    ) : (
                                                        <Button asChild size="sm" variant="outline" className="h-7 gap-1">
                                                            <a href={it.url ?? '#'}>
                                                                <ExternalLink className="size-3.5" /> Buka untuk Review
                                                            </a>
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

function ReviewDialog({ item, fullWidth = false }: { item: QueueItem; fullWidth?: boolean }) {
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    const docId = item.doc_id;
    const isSop = item.doc_kind === 'sop';

    const act = (action: 'approve' | 'revise' | 'reject') => {
        // Revisi & Tolak wajib disertai keterangan; Setujui boleh kosong.
        if (action !== 'approve' && note.trim() === '') {
            setError('Catatan / keterangan wajib diisi untuk permintaan revisi atau penolakan.');
            return;
        }
        setError('');
        setProcessing(true);
        router.post(
            `/approvals/${item.approval_id}/${action}`,
            action === 'approve' ? { comment: note } : { reason: note },
            {
                preserveScroll: true,
                onSuccess: () => setOpen(false),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    className={fullWidth ? 'h-9 w-full gap-1' : 'h-7 gap-1'}
                >
                    <Search className="size-3.5" /> Review
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Review · {item.code}</DialogTitle>
                    <DialogDescription>{item.title}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
                        <div>
                            <div className="text-[11px] uppercase text-muted-foreground">Jenis</div>
                            <div>{item.type_label}</div>
                        </div>
                        <div>
                            <div className="text-[11px] uppercase text-muted-foreground">Level · Role</div>
                            <div>L{item.level} · {item.role_required}</div>
                        </div>
                        <div>
                            <div className="text-[11px] uppercase text-muted-foreground">Diminta pada</div>
                            <div>{item.created_at}</div>
                        </div>
                    </div>

                    {/* Review links — buka dokumen / preview PDF sebelum memutuskan */}
                    {docId && (
                        <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline" className="gap-1.5">
                                <a href={`/documents/${docId}`} target="_blank" rel="noreferrer">
                                    <ExternalLink className="size-4" /> Buka detail dokumen
                                </a>
                            </Button>
                            {isSop && (
                                <Button asChild size="sm" variant="outline" className="gap-1.5">
                                    <a href={`/documents/${docId}/preview-pdf`} target="_blank" rel="noreferrer">
                                        <FileText className="size-4" /> Preview PDF
                                    </a>
                                </Button>
                            )}
                        </div>
                    )}

                    <div className="grid gap-1.5">
                        <Label htmlFor="review-note">
                            Catatan / Keterangan{' '}
                            <span className="font-normal text-muted-foreground">(wajib untuk Revisi / Tolak)</span>
                        </Label>
                        <Textarea
                            id="review-note"
                            rows={3}
                            placeholder="Tulis keterangan permintaan revisi atau alasan penolakan…"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                        {error && <p className="text-xs text-red-600">{error}</p>}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        className="gap-1.5 text-red-700"
                        disabled={processing}
                        onClick={() => act('reject')}
                    >
                        <XCircle className="size-4" /> Tolak
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-1.5 text-blue-700"
                            disabled={processing}
                            onClick={() => act('revise')}
                        >
                            <RotateCcw className="size-4" /> Minta Revisi
                        </Button>
                        <Button
                            type="button"
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                            disabled={processing}
                            onClick={() => act('approve')}
                        >
                            <CheckCircle2 className="size-4" /> Setujui
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
