<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingParticipant extends Model
{
    protected $fillable = [
        'training_id', 'user_id', 'attendance',
        'pre_score', 'post_score', 'result', 'certificate_path',
    ];

    protected $casts = [
        'pre_score'  => 'decimal:2',
        'post_score' => 'decimal:2',
    ];

    public function training(): BelongsTo
    {
        return $this->belongsTo(Training::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
