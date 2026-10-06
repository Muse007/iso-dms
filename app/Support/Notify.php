<?php

namespace App\Support;

use App\Models\User;
use App\Notifications\WorkflowNotification;

class Notify
{
    /**
     * Kirim notifikasi in-app (+ WhatsApp bila aktif) ke $user.
     * Tidak mengirim ke pelaku aksi itu sendiri, dan tidak pernah menggagalkan request utama.
     */
    public static function to(?User $user, string $title, string $body, ?string $url = null, string $type = 'info'): void
    {
        if (! $user) {
            return;
        }
        if (auth()->id() && (int) $user->id === (int) auth()->id()) {
            return;
        }

        try {
            $user->notify(new WorkflowNotification($title, $body, $url, $type));
        } catch (\Throwable $e) {
            // abaikan — notifikasi tidak boleh menggagalkan alur utama
        }
    }

    /** Kirim ke banyak user (dedup by id). */
    public static function many(iterable $users, string $title, string $body, ?string $url = null, string $type = 'info'): void
    {
        $seen = [];
        foreach ($users as $u) {
            if (! $u || isset($seen[$u->id])) {
                continue;
            }
            $seen[$u->id] = true;
            static::to($u, $title, $body, $url, $type);
        }
    }
}
