<?php

namespace App\Notifications;

use App\Notifications\Channels\FonnteChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Notifikasi alur kerja untuk satu user:
 *  - kanal database  -> muncul sebagai pop-up pojok kanan bawah + lonceng (in-app)
 *  - kanal Fonnte    -> reminder WhatsApp (hanya jika FONNTE_ENABLED & user punya phone)
 */
class WorkflowNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $title,
        public string $body,
        public ?string $url = null,
        public string $type = 'info', // info | success | warning | action
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if (config('services.fonnte.enabled')
            && config('services.fonnte.token')
            && ! empty($notifiable->phone)) {
            $channels[] = FonnteChannel::class;
        }

        return $channels;
    }

    /** Payload untuk in-app (dibaca oleh lonceng & toaster). */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'body'  => $this->body,
            'url'   => $this->url,
            'type'  => $this->type,
        ];
    }

    /** Teks pesan WhatsApp. */
    public function toFonnte(object $notifiable): string
    {
        $lines = ["*{$this->title}*", '', $this->body];

        if ($this->url) {
            $lines[] = '';
            $lines[] = rtrim((string) config('app.url'), '/').$this->url;
        }

        $lines[] = '';
        $lines[] = '— QMS BONECOM TRICOM';

        return implode("\n", $lines);
    }
}
