<?php

namespace App\Http\Controllers;

use App\Models\Approval;
use App\Models\AuditFinding;
use App\Models\AuditSchedule;
use App\Workflow\ApprovalService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalController extends Controller
{
    public function __construct(private ApprovalService $service) {}

    /**
     * Unified approval queue — every kind of pending approval assigned to the current user:
     *   1. Document / workflow approvals (generic Approval records) — actionable inline.
     *   2. Audit schedule (FM-BDK-007) MR approvals — for QMR / super_admin.
     *   3. Audit finding (Minor/Major NC) approvals — for the auditee's department manager.
     */
    public function index(Request $request): Response
    {
        $user  = $request->user();
        $queue = collect();

        // 1) Generic document / workflow approvals awaiting me.
        $docApprovals = Approval::query()
            ->with('approvable')
            ->where('approver_id', $user->id)
            ->where('status', Approval::STATUS_PENDING)
            ->orderBy('created_at')
            ->get();

        foreach ($docApprovals as $a) {
            $short = class_basename($a->approvable_type);
            $queue->push([
                'kind'          => 'document',
                'is_document'   => true,
                'approval_id'   => $a->id,
                'level'         => $a->level,
                'role_required' => $a->role_required,
                'doc_id'        => $a->approvable_id,
                'doc_kind'      => $a->approvable->type ?? null,
                'code'          => $a->approvable->code ?? "#{$a->approvable_id}",
                'title'         => $a->approvable->title ?? null,
                'type_label'    => $short === 'Document' ? 'Dokumen' : $short,
                'context'       => "L{$a->level} · {$a->role_required}",
                'url'           => $a->approvable_id ? "/documents/{$a->approvable_id}" : null,
                'created_at'    => optional($a->created_at)->format('d M Y H:i'),
            ]);
        }

        // 2) Audit schedules awaiting MR approval (one overall approval per SA code).
        if ($user->hasAnyRole(['qmr', 'super_admin'])) {
            $schedules = AuditSchedule::withCount('audits')
                ->where('status', AuditSchedule::STATUS_PENDING_REVIEW)
                ->orderBy('created_at')
                ->get();

            foreach ($schedules as $s) {
                $queue->push([
                    'kind'        => 'audit_schedule',
                    'is_document' => false,
                    'code'        => $s->code,
                    'title'       => trim(($s->period_label ?? 'Schedule Audit Internal')." · {$s->audits_count} bagian"),
                    'type_label'  => 'Jadwal Audit',
                    'context'     => 'MR / QMR',
                    'url'         => "/audit-schedules/{$s->id}",
                    'created_at'  => optional($s->created_at)->format('d M Y H:i'),
                ]);
            }
        }

        // 3) Audit findings (Minor/Major NC) awaiting my approval as department manager.
        $sevLabel = ['major_nc' => 'Major NC', 'minor_nc' => 'Minor NC', 'opportunity' => 'PFI'];
        $findings = AuditFinding::with(['audit:id,code,department_id', 'audit.department:id,name'])
            ->where('approver_id', $user->id)
            ->where('status', AuditFinding::STATUS_WAITING_APPROVAL)
            ->orderBy('created_at')
            ->get();

        foreach ($findings as $f) {
            $sev = $sevLabel[$f->category] ?? $f->category;
            $queue->push([
                'kind'        => 'audit_finding',
                'is_document' => false,
                'code'        => $f->reference,
                'title'       => ($f->audit->department->name ?? '—').' — '.$sev.': '.Str::limit((string) $f->description, 80),
                'type_label'  => 'Temuan Audit',
                'context'     => $sev,
                'url'         => "/audits/{$f->audit_id}/findings/{$f->id}",
                'created_at'  => optional($f->created_at)->format('d M Y H:i'),
            ]);
        }

        return Inertia::render('approvals/index', [
            'queue' => $queue->values(),
        ]);
    }

    public function approve(Request $request, Approval $approval): RedirectResponse
    {
        $data = $request->validate([
            'comment'        => ['nullable', 'string', 'max:2000'],
            'signature_path' => ['nullable', 'string', 'max:255'],
        ]);
        $this->service->approve($approval, $request->user(), $data['comment'] ?? null, $data['signature_path'] ?? null);

        return back()->with('flash.success', 'Approval recorded.');
    }

    public function reject(Request $request, Approval $approval): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:2000']]);
        $this->service->reject($approval, $request->user(), $data['reason']);

        return back()->with('flash.success', 'Approval rejected.');
    }

    public function revise(Request $request, Approval $approval): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:2000']]);
        $this->service->revise($approval, $request->user(), $data['reason']);

        return back()->with('flash.success', 'Revision requested.');
    }
}
