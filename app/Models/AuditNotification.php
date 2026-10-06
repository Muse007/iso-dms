<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AuditNotification extends Model
{
    protected $fillable = [
        'subject_type', 'subject_id', 'type', 'subject_line',
        'recipients', 'cc', 'status', 'error', 'results',
    ];

    protected $casts = [
        'recipients' => 'array',
        'cc'         => 'array',
        'results'    => 'array',
    ];

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }
}
