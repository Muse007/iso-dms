<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code', 'name', 'contact_person', 'email', 'phone', 'address',
        'categories', 'status', 'latest_score', 'approved_until', 'notes',
    ];

    protected $casts = [
        'categories'     => 'array',
        'latest_score'   => 'decimal:2',
        'approved_until' => 'date',
    ];

    public function evaluations(): HasMany
    {
        return $this->hasMany(SupplierEvaluation::class)->orderByDesc('period');
    }
}
