<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Kpi extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code', 'name', 'department_id', 'owner_id',
        'frequency', 'direction', 'target', 'unit', 'formula', 'is_active',
    ];

    protected $casts = [
        'target'    => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function records(): HasMany
    {
        return $this->hasMany(KpiRecord::class)->orderByDesc('period');
    }
}
