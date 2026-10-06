<?php

namespace App\Workflow\Events;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ApprovalCompleted
{
    use Dispatchable, SerializesModels;

    public function __construct(public Model $approvable, public string $outcome) {}
}
