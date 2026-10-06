<?php

namespace App\Notifications\Audit;

use App\Models\AuditFinding;
use App\Models\AuditNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Unified reminder used for H-1 (due_soon), H+1 (overdue), H+3 (escalation).
 */
class FindingReminderNotification extends Notification
{
    use Queueable;

    public const KIND_DUE_SOON   = 'due_soon';
    public const KIND_OVERDUE    = 'overdue';
    public const KIND_ESCALATION = 'escalation';

    public function __construct(public AuditFinding $finding, public string $kind) {}

    public function via($notifiable): array { return ['mail']; }

    public function toMail($notifiable): MailMessage
    {
        $f = $this->finding->loadMissing('audit');
        [$subject, $intro, $level] = match ($this->kind) {
            self::KIND_DUE_SOON => [
                "Reminder: CA {$f->audit->code}/F-{$f->id} jatuh tempo besok",
                'Tindakan perbaikan akan jatuh tempo besok.',
                'line',
            ],
            self::KIND_OVERDUE => [
                "Corrective Action {$f->audit->code}/F-{$f->id} telah overdue",
                'Tindakan perbaikan telah melewati deadline.',
                'error',
            ],
            self::KIND_ESCALATION => [
                "[ESCALATION] CA {$f->audit->code}/F-{$f->id} overdue 3 hari",
                'Tindakan perbaikan telah melewati deadline lebih dari 3 hari. Diperlukan tindakan manajemen.',
                'error',
            ],
        };

        $mail = (new MailMessage)
            ->subject($subject)
            ->greeting("Yth. {$notifiable->name},")
            ->line($intro)
            ->line("**Temuan:** {$f->description}")
            ->line("**Due Date:** ".($f->due_date?->format('d M Y') ?? '—'))
            ->action('Buka Temuan', url("/audits/{$f->audit_id}/findings/{$f->id}"));

        if ($level === 'error') $mail->error();

        return $mail;
    }

    public static function log(AuditFinding $f, string $kind, array $to, array $cc = []): void
    {
        AuditNotification::create([
            'subject_type' => AuditFinding::class,
            'subject_id'   => $f->id,
            'type'         => "finding.{$kind}",
            'subject_line' => match ($kind) {
                self::KIND_DUE_SOON   => "Reminder H-1 F-{$f->id}",
                self::KIND_OVERDUE    => "Overdue H+1 F-{$f->id}",
                self::KIND_ESCALATION => "Escalation H+3 F-{$f->id}",
            },
            'recipients'   => $to,
            'cc'           => $cc,
        ]);
    }
}
