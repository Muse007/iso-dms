<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierEvaluation extends Model
{
    protected $fillable = [
        'supplier_id', 'period', 'quality_score', 'delivery_score',
        'price_score', 'service_score', 'total_score', 'result',
        'comment', 'evaluated_by',
    ];

    protected $casts = [
        'period'         => 'date',
        'quality_score'  => 'decimal:2',
        'delivery_score' => 'decimal:2',
        'price_score'    => 'decimal:2',
        'service_score'  => 'decimal:2',
        'total_score'    => 'decimal:2',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluated_by');
    }

    public static function resultFromScore(float $score): string
    {
        return match (true) {
            $score >= 80 => 'approved',
            $score >= 60 => 'conditional',
            default      => 'rejected',
        };
    }
}
