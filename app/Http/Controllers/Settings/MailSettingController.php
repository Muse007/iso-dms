<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class MailSettingController extends Controller
{
    public function edit(): Response
    {
        $m = Setting::mailConfig();

        return Inertia::render('settings/mail', [
            'mail' => [
                'mailer'       => $m['mailer']       ?: config('mail.default'),
                'host'         => $m['host']         ?? config('mail.mailers.smtp.host'),
                'port'         => $m['port']         ?? config('mail.mailers.smtp.port'),
                'username'     => $m['username']     ?? config('mail.mailers.smtp.username'),
                'encryption'   => ($m['encryption'] ?? config('mail.mailers.smtp.encryption')) ?: 'none',
                'from_address' => $m['from_address'] ?? config('mail.from.address'),
                'from_name'    => $m['from_name']    ?? config('mail.from.name'),
                'password_set' => ! empty($m['password']),
            ],
            'isDbConfigured' => ! empty($m['mailer']),
            'envMailer'      => config('mail.default'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'mailer'       => ['required', 'in:smtp,log'],
            'host'         => ['nullable', 'string', 'max:255', 'required_if:mailer,smtp'],
            'port'         => ['nullable', 'integer', 'min:1', 'max:65535', 'required_if:mailer,smtp'],
            'username'     => ['nullable', 'string', 'max:255'],
            'password'     => ['nullable', 'string', 'max:255'],
            'encryption'   => ['required', 'in:tls,ssl,none'],
            'from_address' => ['required', 'email', 'max:255'],
            'from_name'    => ['required', 'string', 'max:255'],
        ], [], [
            'host' => 'SMTP Host',
            'port' => 'SMTP Port',
        ]);

        Setting::set('mail.mailer', $data['mailer']);
        Setting::set('mail.host', $data['host'] ?? '');
        Setting::set('mail.port', $data['port'] !== null ? (string) $data['port'] : '');
        Setting::set('mail.username', $data['username'] ?? '');
        Setting::set('mail.encryption', $data['encryption'] === 'none' ? '' : $data['encryption']);
        Setting::set('mail.from_address', $data['from_address']);
        Setting::set('mail.from_name', $data['from_name']);

        // Only overwrite the password when a new one is provided (keep existing otherwise).
        if (! empty($data['password'])) {
            Setting::set('mail.password', Crypt::encryptString($data['password']));
        }

        return back()->with('flash.success', 'Konfigurasi email disimpan.');
    }

    public function test(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'test_email' => ['required', 'email'],
        ]);

        // Make sure the just-saved settings are in effect for this request.
        Setting::applyMailConfig();

        try {
            Mail::raw(
                "Ini adalah email percobaan dari ISO-DMS.\n\nJika Anda menerima email ini, konfigurasi SMTP sudah benar dan email dapat terkirim.",
                fn ($message) => $message->to($data['test_email'])->subject('[ISO-DMS] Test Email Konfigurasi'),
            );
        } catch (\Throwable $e) {
            return back()->with('flash.error', 'Gagal mengirim email: '.$e->getMessage());
        }

        $via = config('mail.default');
        $note = $via === 'log'
            ? ' (mode "log" — email ditulis ke storage/logs/laravel.log, bukan benar-benar dikirim).'
            : '.';

        return back()->with('flash.success', "Email test dikirim ke {$data['test_email']}{$note}");
    }
}
