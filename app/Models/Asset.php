<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Asset extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code', 'name', 'serial_no', 'brand', 'model', 'department_id',
        'location', 'measurement_range', 'tolerance',
        'calibration_interval_months',
        'last_calibration_date', 'next_calibration_date', 'status',
    ];

    protected $casts = [
        'last_calibration_date' => 'date',
        'next_calibration_date' => 'date',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function calibrations(): HasMany
    {
        return $this->hasMany(Calibration::class)->orderByDesc('calibration_date');
    }

    public function isOverdue(): bool
    {
        return $this->next_calibration_date && $this->next_calibration_date->isPast();
    }
}
