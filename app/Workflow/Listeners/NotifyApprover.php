<?php

namespace App\Workflow\Listeners;

use App\Models\User;
use App\Workflow\Events\ApprovalRequested;
use App\Workflow\Notifications\ApprovalRequestedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;

class NotifyApprover implements ShouldQueue
{
    public function handle(ApprovalRequested $event): void
    {
        $approver = User::find($event->approval->approver_id);
        $approver?->notify(new ApprovalRequestedNotification($event->approval));
    }
}
