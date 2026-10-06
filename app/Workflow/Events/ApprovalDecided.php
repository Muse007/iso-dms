<?php

namespace App\Workflow\Events;

use App\Models\Approval;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ApprovalDecided
{
    use Dispatchable, SerializesModels;

    public function __construct(public Approval $approval, public string $decision) {}
}
