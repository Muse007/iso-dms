<?php

namespace App\Models;

use App\Models\Concerns\SerializesLocalDates;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Approval extends Model
{
    use SerializesLocalDates;

    public const STATUS_PENDING  = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_REVISION = 'revision';
    public const STATUS_SKIPPED  = 'skipped';

    protected $fillable = [
        'approvable_type', 'approvable_id', 'level', 'role_required',
        'approver_id', 'status', 'comment', 'signature_path',
        'decided_at', 'escalated_at',
    ];

    protected $casts = [
        'decided_at'   => 'datetime',
        'escalated_at' => 'datetime',
    ];

    public function approvable(): MorphTo
    {
        return $this->morphTo();
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }
}
