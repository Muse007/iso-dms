<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Audit extends Model
{
    use SoftDeletes, LogsActivity;

    protected $fillable = [
        'code', 'schedule_group', 'audit_schedule_id', 'title', 'period_label', 'standard', 'standards', 'type', 'department_id', 'location',
        'lead_auditor_id', 'team', 'auditees', 'cc_user_ids',
        'actual_lead_auditor_id', 'actual_team',
        'auditor_change_reason', 'auditor_changed_at', 'auditor_changed_by',
        'planned_date', 'jam_pelaksanaan', 'actual_start_date', 'actual_end_date',
        'status', 'scope', 'objectives', 'processes', 'summary', 'report_path', 'notified_at',
    ];

    protected $casts = [
        'team'                => 'array',
        'auditees'            => 'array',
        'cc_user_ids'         => 'array',
        'actual_team'         => 'array',
        'standards'           => 'array',
        'processes'           => 'array',
        'planned_date'        => 'date:Y-m-d',
        'actual_start_date'   => 'date:Y-m-d',
        'actual_end_date'     => 'date:Y-m-d',
        'auditor_changed_at'  => 'datetime',
        'notified_at'         => 'datetime',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logFillable()->logOnlyDirty()->useLogName('audit');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(AuditSchedule::class, 'audit_schedule_id');
    }

    public function leadAuditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lead_auditor_id');
    }

    public function actualLeadAuditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actual_lead_auditor_id');
    }

    public function auditorChangedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auditor_changed_by');
    }

    /** True bila auditor pelaksana berbeda dari yang dijadwalkan. */
    public function hasAuditorChange(): bool
    {
        return $this->actual_lead_auditor_id !== null || $this->actual_team !== null;
    }

    /**
     * Lead auditor yang benar-benar melaksanakan — aktual bila ada, selain itu
     * jatuh kembali ke rencana. Dipakai untuk hak akses & tampilan operasional;
     * dokumen jadwal FM-BDK-007 tetap memakai kolom rencana.
     */
    public function effectiveLeadAuditorId(): ?int
    {
        return $this->actual_lead_auditor_id ?? $this->lead_auditor_id;
    }

    /** Lead auditor pelaksana sebagai model User — aktual bila ada, selain itu rencana. */
    public function effectiveLeadAuditor(): ?User
    {
        return $this->actualLeadAuditor ?? $this->leadAuditor;
    }

    /** Tim auditor pelaksana — aktual bila sudah pernah diisi, selain itu rencana. */
    public function effectiveTeam(): array
    {
        return collect($this->actual_team ?? $this->team ?? [])->filter()->map(fn ($id) => (int) $id)->values()->all();
    }

    /** Semua auditor pelaksana (lead + tim), untuk pengecekan hak akses. */
    public function effectiveAuditorIds(): array
    {
        return collect([$this->effectiveLeadAuditorId(), ...$this->effectiveTeam()])->filter()->unique()->values()->all();
    }

    public function findings(): HasMany
    {
        return $this->hasMany(AuditFinding::class);
    }

    public function notifications(): MorphMany
    {
        return $this->morphMany(AuditNotification::class, 'subject');
    }

    public function scopeUpcoming(Builder $q): Builder
    {
        return $q->whereIn('status', ['planned', 'scheduled'])
            ->whereDate('planned_date', '>=', now()->toDateString())
            ->orderBy('planned_date');
    }

    public function teamUsers()
    {
        $ids = collect($this->team)->filter()->all();
        return $ids ? User::whereIn('id', $ids)->get() : collect();
    }

    public function auditeeUsers()
    {
        $ids = collect($this->auditees)->filter()->all();
        return $ids ? User::whereIn('id', $ids)->get() : collect();
    }
}
