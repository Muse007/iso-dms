<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditFindingEvent extends Model
{
    protected $fillable = ['audit_finding_id', 'user_id', 'action', 'stage', 'note', 'meta'];

    protected $casts = ['meta' => 'array'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function finding(): BelongsTo
    {
        return $this->belongsTo(AuditFinding::class, 'audit_finding_id');
    }
}
