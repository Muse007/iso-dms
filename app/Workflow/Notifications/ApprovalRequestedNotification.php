<?php

namespace App\Workflow\Notifications;

use App\Models\Approval;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ApprovalRequestedNotification extends Notification
{
    use Queueable;

    public function __construct(public Approval $approval) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $this->approval->loadMissing('approvable');
        return [
            'approval_id'     => $this->approval->id,
            'level'           => $this->approval->level,
            'approvable_type' => class_basename($this->approval->approvable_type),
            'approvable_id'   => $this->approval->approvable_id,
            'title'           => $this->approval->approvable->title
                              ?? $this->approval->approvable->code
                              ?? "Item #{$this->approval->approvable_id}",
            'message'         => "An approval at level {$this->approval->level} requires your action.",
        ];
    }
}
