<?php

namespace App\Workflow\Jobs;

use App\Models\Approval;
use App\Workflow\Events\ApprovalRequested;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Periodic job (scheduler) that re-notifies approvers
 * whose approval has been idle longer than the SLA threshold.
 *
 * Idle > 2 days → re-notify; idle > 5 days → escalate to director.
 */
class EscalateStaleApprovals implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        Approval::query()
            ->where('status', Approval::STATUS_PENDING)
            ->whereNotNull('approver_id')
            ->where('created_at', '<=', now()->subDays(2))
            ->whereNull('escalated_at')
            ->cursor()
            ->each(function (Approval $approval) {
                $approval->forceFill(['escalated_at' => now()])->save();
                event(new ApprovalRequested($approval));
            });
    }
}
