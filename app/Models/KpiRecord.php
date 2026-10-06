<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KpiRecord extends Model
{
    protected $fillable = [
        'kpi_id', 'period', 'actual', 'target_snapshot',
        'achievement_pct', 'status', 'note', 'recorded_by',
    ];

    protected $casts = [
        'period'          => 'date',
        'actual'          => 'decimal:2',
        'target_snapshot' => 'decimal:2',
        'achievement_pct' => 'decimal:2',
    ];

    public function kpi(): BelongsTo
    {
        return $this->belongsTo(Kpi::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public static function statusFromAchievement(float $pct, string $direction = 'higher_is_better'): string
    {
        if ($direction === 'lower_is_better') {
            return match (true) {
                $pct <= 100 => 'green',
                $pct <= 120 => 'amber',
                default     => 'red',
            };
        }
        return match (true) {
            $pct >= 100 => 'green',
            $pct >= 80  => 'amber',
            default     => 'red',
        };
    }
}
