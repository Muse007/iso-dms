<?php

namespace App\Models;

use App\Workflow\Approvable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Risk extends Model
{
    use SoftDeletes, Approvable, LogsActivity;

    protected $fillable = [
        'code', 'title', 'department_id', 'owner_id', 'category',
        'context', 'cause', 'impact',
        'severity', 'likelihood', 'score', 'level',
        'treatment_plan', 'residual_severity', 'residual_likelihood', 'residual_score',
        'status', 'review_date',
    ];

    protected $casts = ['review_date' => 'date'];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable()->logOnlyDirty()->useLogName('risk');
    }

    public function approvalFlow(): array
    {
        return $this->score >= 15 ? ['manager', 'director'] : ['manager'];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /** score = severity * likelihood; level derived from score */
    public static function levelFromScore(int $score): string
    {
        return match (true) {
            $score >= 15 => 'critical',
            $score >= 10 => 'high',
            $score >= 5  => 'medium',
            default      => 'low',
        };
    }
}
