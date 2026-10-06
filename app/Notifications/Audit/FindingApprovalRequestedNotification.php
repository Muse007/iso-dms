<?php

namespace App\Notifications\Audit;

use App\Models\AuditFinding;
use App\Models\AuditNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class FindingApprovalRequestedNotification extends Notification
{
    use Queueable;

    public function __construct(public AuditFinding $finding) {}

    public function via($notifiable): array { return ['mail']; }

    public function toMail($notifiable): MailMessage
    {
        $f = $this->finding->loadMissing(['audit', 'owner']);
        $label = match ($f->category) {
            AuditFinding::CAT_MAJOR => 'Major',
            AuditFinding::CAT_MINOR => 'Minor',
            default                 => ucfirst($f->category),
        };

        return (new MailMessage)
            ->subject("Approval Corrective Action — {$f->audit->code}/F-{$f->id}")
            ->greeting("Yth. {$notifiable->name},")
            ->line("Terdapat temuan audit kategori **{$label}** di departemen "
                .($f->audit->department->name ?? '—').".")
            ->line("**Temuan:** {$f->description}")
            ->when($f->root_cause, fn ($m) => $m->line("**Root Cause:** {$f->root_cause}"))
            ->when($f->corrective_action, fn ($m) => $m->line("**Corrective Action:** {$f->corrective_action}"))
            ->when($f->due_date, fn ($m) => $m->line('**Due Date:** '.$f->due_date->format('d M Y')))
            ->action('Approve di Sistem', url("/audits/{$f->audit_id}/findings/{$f->id}"))
            ->line('Mohon approval Bapak/Ibu untuk tindakan perbaikan ini.');
    }

    public static function log(AuditFinding $f, array $to): void
    {
        AuditNotification::create([
            'subject_type' => AuditFinding::class,
            'subject_id'   => $f->id,
            'type'         => 'finding.approval_requested',
            'subject_line' => "Approval Corrective Action F-{$f->id}",
            'recipients'   => $to,
        ]);
    }
}
