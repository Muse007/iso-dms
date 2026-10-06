<?php

namespace App\Models;

use App\Models\Concerns\SerializesLocalDates;
use App\Workflow\Approvable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Document extends Model
{
    use HasFactory, SoftDeletes, Approvable, LogsActivity, SerializesLocalDates;

    public const STATUS_DRAFT      = 'draft';
    public const STATUS_IN_REVIEW  = 'in_review';
    public const STATUS_APPROVED   = 'approved';
    public const STATUS_PUBLISHED  = 'published';
    public const STATUS_OBSOLETE   = 'obsolete';
    public const STATUS_WITHDRAWN  = 'withdrawn';
    public const STATUS_REJECTED   = 'rejected';

    protected $fillable = [
        'code', 'title', 'type', 'standard', 'standards', 'department_id', 'owner_id',
        'status', 'effective_date', 'next_review_date', 'current_revision',
        'description', 'distribution_list',
        'purpose', 'scope', 'references_list', 'iso_clauses', 'definitions',
        'responsibilities', 'procedure_steps', 'related_documents',
        'section_images', 'revision_history',
        'prepared_by_name', 'prepared_by_date', 'prepared_by_user_id',
        'reviewed_by_name', 'reviewed_by_date', 'reviewed_by_user_id',
        'reviewed_by_2_name', 'reviewed_by_2_date', 'reviewed_by_2_user_id',
        'approved_by_name', 'approved_by_date', 'approved_by_user_id',
        'document_control_user_id',
        'reviewed_at', 'reviewed_2_at', 'approved_at', 'doc_control_approved_at',
        'flowchart_path',
    ];

    protected $casts = [
        'effective_date'    => 'date',
        'next_review_date'  => 'date',
        'distribution_list' => 'array',
        'standards'         => 'array',
        'references_list'   => 'array',
        'iso_clauses'       => 'array',
        'definitions'       => 'array',
        'responsibilities'  => 'array',
        'procedure_steps'   => 'array',
        'related_documents' => 'array',
        'section_images'    => 'array',
        'revision_history'  => 'array',
        'prepared_by_date'  => 'date',
        'reviewed_by_date'  => 'date',
        'reviewed_by_2_date'=> 'date',
        'approved_by_date'  => 'date',
        'reviewed_at'             => 'datetime',
        'reviewed_2_at'           => 'datetime',
        'approved_at'             => 'datetime',
        'doc_control_approved_at' => 'datetime',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        // Only log lightweight, audit-relevant fields. Listing every fillable
        // (incl. large JSON columns like procedure_steps, definitions) inflates
        // each activity row and can exhaust memory on hot paths (workflow approvals).
        return LogOptions::defaults()
            ->logOnly([
                'code', 'title', 'type', 'standard', 'status',
                'current_revision', 'effective_date', 'next_review_date',
                'department_id', 'owner_id',
                'reviewed_at', 'approved_at', 'doc_control_approved_at',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('document');
    }

    /**
     * For documents the workflow uses per-document user picks (reviewer, approver,
     * document control) instead of generic roles. The labels here are descriptive
     * only — DocumentController::submit() creates approval rows with explicit
     * approver_id, bypassing role resolution.
     */
    public function approvalFlow(): array
    {
        return ['reviewer', 'approver', 'document_control'];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function preparedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by_user_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }

    public function reviewedByTwo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_2_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function documentControl(): BelongsTo
    {
        return $this->belongsTo(User::class, 'document_control_user_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DocumentVersion::class)->orderByDesc('created_at');
    }

    public function currentVersion(): HasMany
    {
        return $this->hasMany(DocumentVersion::class)->where('is_current', true);
    }
}
