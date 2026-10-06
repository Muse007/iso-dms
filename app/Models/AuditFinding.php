<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class AuditFinding extends Model
{
    public const CAT_PFI   = 'opportunity';
    public const CAT_MINOR = 'minor_nc';
    public const CAT_MAJOR = 'major_nc';

    public const STATUS_OPEN                         = 'open';
    public const STATUS_IN_PROGRESS                  = 'in_progress';
    public const STATUS_WAITING_APPROVAL             = 'waiting_approval';
    public const STATUS_WAITING_AUDITOR_VERIFICATION = 'waiting_auditor_verification';
    public const STATUS_WAITING_VERIFICATION         = 'waiting_verification';
    public const STATUS_CLOSED                       = 'closed';
    public const STATUS_REJECTED                     = 'rejected';

    protected $fillable = [
        'audit_id', 'reference', 'category', 'clause', 'description',
        'root_cause', 'root_causes', 'corrective_action', 'preventive_action',
        'evidence', 'evidence_files', 'action_evidence_files', 'preventive_action_evidence_files',
        'finding_owner_id', 'auditor_id', 'approver_id', 'verifier_id',
        'status', 'due_date',
        'submitted_at', 'approved_at', 'approval_note',
        'auditor_verified_at', 'auditor_verification_note',
        'verified_at', 'verification_note', 'closed_at',
    ];

    protected $casts = [
        'due_date'                          => 'date:Y-m-d',
        'submitted_at'                      => 'datetime',
        'approved_at'                       => 'datetime',
        'auditor_verified_at'               => 'datetime',
        'verified_at'                       => 'datetime',
        'closed_at'                         => 'datetime',
        'evidence_files'                    => 'array',
        'action_evidence_files'             => 'array',
        'preventive_action_evidence_files'  => 'array',
        'root_causes'                       => 'array',
    ];

    public function audit(): BelongsTo
    {
        return $this->belongsTo(Audit::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finding_owner_id');
    }

    public function auditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auditor_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verifier_id');
    }

    public function correctiveActions(): MorphMany
    {
        return $this->morphMany(CorrectiveAction::class, 'source_ref');
    }

    public function events(): HasMany
    {
        return $this->hasMany(AuditFindingEvent::class)->orderBy('created_at')->orderBy('id');
    }

    /**
     * Catat satu event ke riwayat/log temuan (append-only).
     *
     * `$note` = teks tulisan pengguna (alasan revisi/penolakan), ditampilkan
     * sebagai kutipan. `$meta` = jejak terstruktur dari sistem, mis. jumlah
     * berkas bukti yang benar-benar diterima saat submit — dipisah agar log
     * bisa menjawab "hilang atau tidak pernah dilampirkan?" tanpa menebak.
     */
    public function recordEvent(string $action, ?string $note = null, ?string $stage = null, array $meta = []): void
    {
        $this->events()->create([
            'user_id' => auth()->id(),
            'action'  => $action,
            'stage'   => $stage,
            'note'    => $note ?: null,
            'meta'    => $meta ?: null,
        ]);
    }

    public function scopeOverdue(Builder $q): Builder
    {
        return $q->whereNotIn('status', [self::STATUS_CLOSED, self::STATUS_REJECTED])
            ->whereDate('due_date', '<', now()->toDateString());
    }

    /**
     * Temuan baru overdue SETELAH due date lewat — pada hari jatuh tempo masih on-time.
     * `due_date` di-cast ke tanggal (00:00), jadi `isPast()` akan bernilai true sejak
     * pukul 00:01 di hari H; bandingkan terhadap awal hari ini sebagai gantinya.
     */
    public function isOverdue(): bool
    {
        return $this->due_date
            && !in_array($this->status, [self::STATUS_CLOSED, self::STATUS_REJECTED], true)
            && $this->due_date->startOfDay()->lt(today());
    }

    public function requiresApproval(): bool
    {
        return in_array($this->category, [self::CAT_MINOR, self::CAT_MAJOR], true);
    }
}
