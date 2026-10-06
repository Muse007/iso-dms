<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AuditSchedule extends Model
{
    use SoftDeletes;

    public const STATUS_PENDING_REVIEW = 'pending_review';
    public const STATUS_APPROVED       = 'approved';
    public const STATUS_SHARED         = 'shared';
    public const STATUS_REJECTED       = 'rejected';

    protected $fillable = [
        'code', 'period_label', 'standard', 'standards', 'type',
        'lead_auditor_id', 'scope', 'objectives',
        'opening_at', 'closing_at', 'opening_location', 'closing_location', 'audit_categories', 'status',
        'mr_user_id', 'mr_signed_at', 'mr_note',
        'shared_by', 'shared_at', 'created_by',
    ];

    protected $casts = [
        'standards'        => 'array',
        'audit_categories' => 'array',
        'opening_at'       => 'datetime',
        'closing_at'       => 'datetime',
        'mr_signed_at'     => 'datetime',
        'shared_at'        => 'datetime',
    ];

    public function audits(): HasMany
    {
        return $this->hasMany(Audit::class)->orderBy('planned_date')->orderBy('id');
    }

    public function leadAuditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lead_auditor_id');
    }

    public function mr(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mr_user_id');
    }

    public function sharedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shared_by');
    }
}
