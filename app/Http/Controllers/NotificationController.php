<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /** Tandai notifikasi sebagai dibaca lalu redirect ke halaman terkait. */
    public function go(Request $request, string $id): RedirectResponse
    {
        $n = $request->user()->notifications()->find($id);
        if ($n) {
            $n->markAsRead();
        }

        $url = $n?->data['url'] ?? null;

        return redirect()->to($url ?: '/dashboard');
    }

    /** Tandai semua notifikasi sebagai dibaca. */
    public function readAll(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return back();
    }
}
