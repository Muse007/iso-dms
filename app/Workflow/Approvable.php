<?php

namespace App\Workflow;

use App\Models\Approval;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Generic multi-level approval engine.
 *
 * Implementing model must:
 *   - define public function approvalFlow(): array — list of role names per level
 *     e.g. ['supervisor', 'manager', 'director']
 *   - have a `status` column that can hold 'draft'|'in_review'|'approved'|'rejected'
 */
trait Approvable
{
    public function approvals(): MorphMany
    {
        return $this->morphMany(Approval::class, 'approvable')->orderBy('level');
    }

    public function currentApproval(): ?Approval
    {
        return $this->approvals()->where('status', 'pending')->orderBy('level')->first();
    }

    public function currentApprovalLevel(): int
    {
        return $this->approvals()->where('status', 'approved')->count() + 1;
    }

    public function isFullyApproved(): bool
    {
        $required = count($this->approvalFlow());

        return $required > 0
            && $this->approvals()->where('status', 'approved')->count() >= $required;
    }
}
