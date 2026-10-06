<?php

namespace App\Notifications\Channels;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** Kanal pengiriman WhatsApp via gateway Fonnte. */
class FonnteChannel
{
    public function send(object $notifiable, Notification $notification): void
    {
        $phone = static::normalize($notifiable->phone ?? null);
        $token = config('services.fonnte.token');

        if (! $phone || ! $token || ! method_exists($notification, 'toFonnte')) {
            return;
        }

        try {
            Http::withHeaders(['Authorization' => $token])
                ->asForm()
                ->timeout(15)
                ->post(config('services.fonnte.endpoint', 'https://api.fonnte.com/send'), [
                    'target'  => $phone,
                    'message' => $notification->toFonnte($notifiable),
                ]);
        } catch (\Throwable $e) {
            Log::warning('Fonnte WA gagal: '.$e->getMessage());
        }
    }

    /** Normalisasi nomor ke format 62xxxxxxxxxx yang diminta Fonnte. */
    public static function normalize(?string $raw): ?string
    {
        if (! $raw) {
            return null;
        }

        $d = preg_replace('/\D+/', '', $raw);
        if ($d === '') {
            return null;
        }

        if (str_starts_with($d, '620')) {
            $d = '62'.substr($d, 3);
        } elseif (str_starts_with($d, '0')) {
            $d = '62'.substr($d, 1);
        } elseif (! str_starts_with($d, '62')) {
            $d = '62'.$d;
        }

        return $d;
    }
}
