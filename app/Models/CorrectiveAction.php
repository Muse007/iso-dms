<?php

namespace App\Models;

use App\Workflow\Approvable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class CorrectiveAction extends Model
{
    use SoftDeletes, Approvable, LogsActivity;

    public const KIND_NCR  = 'ncr';
    public const KIND_CAR  = 'car';
    public const KIND_CAPA = 'capa';

    protected $fillable = [
        'code', 'kind', 'source', 'source_ref_type', 'source_ref_id',
        'department_id', 'owner_id', 'raised_by_id',
        'title', 'problem_statement', 'immediate_action',
        'root_cause', 'corrective_action', 'preventive_action', 'verification_result',
        'severity', 'status', 'due_date', 'closed_at',
    ];

    protected $casts = [
        'due_date'  => 'date',
        'closed_at' => 'date',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable()->logOnlyDirty()->useLogName('capa');
    }

    public function approvalFlow(): array
    {
        return match ($this->severity) {
            'critical' => ['supervisor', 'manager', 'director'],
            'high'     => ['supervisor', 'manager'],
            default    => ['supervisor'],
        };
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function raisedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'raised_by_id');
    }

    public function sourceRef(): MorphTo
    {
        return $this->morphTo();
    }
}
