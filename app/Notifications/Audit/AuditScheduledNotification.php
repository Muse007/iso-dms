<?php

namespace App\Notifications\Audit;

use App\Models\Audit;
use App\Models\AuditNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AuditScheduledNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Audit $audit,
        public ?string $pdfData = null,
        public ?string $pdfName = null,
    ) {}

    public function via($notifiable): array { return ['mail']; }

    public function toMail($notifiable): MailMessage
    {
        $audit = $this->audit->loadMissing(['leadAuditor', 'department']);

        $subject = $audit->period_label
            ? '[Internal Audit] '.mb_strtoupper($audit->period_label)
            : "[Internal Audit] Jadwal Audit {$audit->code} — ".($audit->department->name ?? '—');

        $mail = (new MailMessage)
            ->subject($subject)
            ->greeting("Yth. {$notifiable->name},")
            ->line("Dengan ini diberitahukan jadwal Internal Audit untuk departemen ".($audit->department->name ?? '—').".")
            ->line("Kode Audit: {$audit->code}")
            ->line("Tanggal: ".$audit->planned_date->format('d M Y'))
            ->line("Lokasi: ".($audit->location ?: '—'))
            ->line("Lead Auditor: ".($audit->leadAuditor->name ?? '—'))
            ->line('Mohon menyiapkan dokumen pendukung sebelum tanggal audit pada file sharing QMS masing masing bagian.')
            ->when($this->pdfData, fn ($m) => $m->line('Jadwal audit yang telah disetujui MR terlampir dalam bentuk PDF pada email ini.'))
            ->action('Lihat Detail Audit', url("/audits/{$audit->id}"))
            ->salutation('— Document Control');

        if ($this->pdfData) {
            $mail->attachData($this->pdfData, $this->pdfName ?: "Jadwal-Audit-{$audit->code}.pdf", [
                'mime' => 'application/pdf',
            ]);
        }

        return $mail;
    }

    public static function log(Audit $audit, array $to, array $cc = []): void
    {
        AuditNotification::create([
            'subject_type' => Audit::class,
            'subject_id'   => $audit->id,
            'type'         => 'audit.scheduled',
            'subject_line' => $audit->period_label
                ? '[Internal Audit] '.mb_strtoupper($audit->period_label)
                : "[Internal Audit] Jadwal Audit {$audit->code}",
            'recipients'   => $to,
            'cc'           => $cc,
        ]);
    }
}
