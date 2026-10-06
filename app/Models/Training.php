<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Training extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code', 'title', 'type', 'category', 'department_id', 'trainer',
        'venue', 'scheduled_date', 'start_time', 'end_time',
        'duration_hours', 'status', 'objectives', 'material_path',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function participants(): HasMany
    {
        return $this->hasMany(TrainingParticipant::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'training_participants')
            ->withPivot(['attendance', 'pre_score', 'post_score', 'result', 'certificate_path'])
            ->withTimestamps();
    }
}
