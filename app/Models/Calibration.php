<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Calibration extends Model
{
    protected $fillable = [
        'asset_id', 'certificate_no', 'type', 'vendor',
        'calibration_date', 'next_due_date', 'result',
        'certificate_path', 'remark', 'performed_by',
    ];

    protected $casts = [
        'calibration_date' => 'date',
        'next_due_date'    => 'date',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
