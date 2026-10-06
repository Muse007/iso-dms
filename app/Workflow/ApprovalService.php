<?php

namespace App\Workflow;

use App\Models\Approval;
use App\Models\Document;
use App\Models\User;
use App\Workflow\Events\ApprovalCompleted;
use App\Workflow\Events\ApprovalDecided;
use App\Workflow\Events\ApprovalRequested;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Generic engine implementing the workflow in flowchart §4.
 *
 *   Staff (submit) → level 1 (role) → level 2 (role) → … → Approved
 *   Branches: revise -> back to draft; reject -> terminal.
 */
class ApprovalService
{
    /**
     * Submit an approvable record into the workflow.
     * Creates one Approval row per level (status=pending for level 1, queued for the rest).
     *
     * @param Model&\App\Workflow\Approvable $approvable
     */
    public function submit(Model $approvable): void
    {
        $flow = $approvable->approvalFlow();
        abort_if(empty($flow), 422, 'Approval flow is not defined for this resource.');

        DB::transaction(function () use ($approvable, $flow) {
            // Reset any previous approvals (re-submission after revision).
            $approvable->approvals()->delete();

            foreach ($flow as $i => $role) {
                $level    = $i + 1;
                $approver = $this->resolveApprover($role, $approvable);

                Approval::create([
                    'approvable_type' => $approvable->getMorphClass(),
                    'approvable_id'   => $approvable->getKey(),
                    'level'           => $level,
                    'role_required'   => $role,
                    'approver_id'     => $approver?->id,
                    'status'          => $level === 1 ? Approval::STATUS_PENDING : Approval::STATUS_PENDING,
                ]);
            }

            if (property_exists($approvable, 'fillable') && in_array('status', $approvable->getFillable(), true)) {
                $approvable->forceFill(['status' => 'in_review'])->save();
            }

            if ($first = $approvable->currentApproval()) {
                event(new ApprovalRequested($first));
            }
        });
    }

    public function approve(Approval $approval, User $actor, ?string $comment = null, ?string $signaturePath = null): void
    {
        $this->guardActor($approval, $actor);

        DB::transaction(function () use ($approval, $actor, $comment, $signaturePath) {
            $approval->update([
                'approver_id'    => $actor->id,
                'status'         => Approval::STATUS_APPROVED,
                'comment'        => $comment,
                'signature_path' => $signaturePath,
                'decided_at'     => now(),
            ]);

            event(new ApprovalDecided($approval, 'approved'));

            $approvable = $approval->approvable()->first();

            // Document-specific: stamp role → timestamp so signatures gate correctly.
            // Keyed by role (not level) so an optional 2nd reviewer doesn't shift the mapping.
            if ($approvable instanceof Document) {
                $updates = match ($approval->role_required) {
                    'reviewer'         => ['reviewed_at' => now()],
                    'reviewer_2'       => ['reviewed_2_at' => now()],
                    'approver'         => ['approved_at' => now()],
                    'document_control' => ['doc_control_approved_at' => now()],
                    default => [],
                };
                if ($updates) {
                    $approvable->forceFill($updates)->save();
                }
            }

            $next = $approvable->approvals()->where('status', Approval::STATUS_PENDING)
                ->orderBy('level')->first();

            if ($next && $next->level > $approval->level) {
                event(new ApprovalRequested($next));
                return;
            }

            // Final approval — Document is "sah" (published) only after document_control.
            $finalStatus = ($approvable instanceof Document) ? 'published' : 'approved';
            $approvable->forceFill(['status' => $finalStatus])->save();
            event(new ApprovalCompleted($approvable, 'approved'));
        });
    }

    public function reject(Approval $approval, User $actor, string $reason): void
    {
        $this->guardActor($approval, $actor);

        DB::transaction(function () use ($approval, $actor, $reason) {
            $approval->update([
                'approver_id' => $actor->id,
                'status'      => Approval::STATUS_REJECTED,
                'comment'     => $reason,
                'decided_at'  => now(),
            ]);

            $approvable = $approval->approvable()->first();
            // Cancel remaining levels
            $approvable->approvals()
                ->where('status', Approval::STATUS_PENDING)
                ->where('level', '>', $approval->level)
                ->update(['status' => Approval::STATUS_SKIPPED]);

            $approvable->forceFill(['status' => 'rejected'])->save();
            event(new ApprovalDecided($approval, 'rejected'));
            event(new ApprovalCompleted($approvable, 'rejected'));
        });
    }

    public function revise(Approval $approval, User $actor, string $reason): void
    {
        $this->guardActor($approval, $actor);

        DB::transaction(function () use ($approval, $actor, $reason) {
            $approval->update([
                'approver_id' => $actor->id,
                'status'      => Approval::STATUS_REVISION,
                'comment'     => $reason,
                'decided_at'  => now(),
            ]);

            $approvable = $approval->approvable()->first();
            $approvable->approvals()
                ->where('status', Approval::STATUS_PENDING)
                ->update(['status' => Approval::STATUS_SKIPPED]);

            $approvable->forceFill(['status' => 'draft'])->save();
            event(new ApprovalDecided($approval, 'revision'));
        });
    }

    private function resolveApprover(string $role, Model $approvable): ?User
    {
        // Prefer approver in the same department; fall back to any user with that role.
        $query = User::role($role);

        if (method_exists($approvable, 'department') && $approvable->department_id) {
            $scoped = (clone $query)->where('department_id', $approvable->department_id)->first();
            if ($scoped) return $scoped;
        }

        return $query->first();
    }

    private function guardActor(Approval $approval, User $actor): void
    {
        abort_if(
            $approval->status !== Approval::STATUS_PENDING,
            422,
            'This approval step is no longer pending.'
        );

        if ($approval->approver_id && $approval->approver_id !== $actor->id) {
            abort_unless(
                $approval->role_required && $actor->hasRole($approval->role_required),
                403,
                'You are not authorised to act on this approval.'
            );
        }
    }
}
