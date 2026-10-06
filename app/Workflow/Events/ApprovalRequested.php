<?php

namespace App\Workflow\Events;

use App\Models\Approval;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ApprovalRequested implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Approval $approval) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('user.'.$this->approval->approver_id)];
    }

    public function broadcastAs(): string
    {
        return 'approval.requested';
    }

    public function broadcastWith(): array
    {
        $a = $this->approval->loadMissing('approvable');
        return [
            'id'              => $a->id,
            'level'           => $a->level,
            'approvable_type' => class_basename($a->approvable_type),
            'approvable_id'   => $a->approvable_id,
            'title'           => $a->approvable->title ?? $a->approvable->code ?? "#{$a->approvable_id}",
        ];
    }
}
