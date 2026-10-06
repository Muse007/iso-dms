<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Schema;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    public static function get(string $key, $default = null)
    {
        $val = static::query()->where('key', $key)->value('value');
        return $val ?? $default;
    }

    public static function set(string $key, $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }

    /** All mail.* settings as a normalised array (password decrypted). */
    public static function mailConfig(): array
    {
        $rows = static::query()->where('key', 'like', 'mail.%')->pluck('value', 'key');

        $password = null;
        if (! empty($rows['mail.password'])) {
            try {
                $password = Crypt::decryptString($rows['mail.password']);
            } catch (\Throwable $e) {
                $password = null;
            }
        }

        return [
            'mailer'       => $rows['mail.mailer']       ?? null,
            'host'         => $rows['mail.host']         ?? null,
            'port'         => $rows['mail.port']         ?? null,
            'username'     => $rows['mail.username']     ?? null,
            'password'     => $password,
            'encryption'   => $rows['mail.encryption']  ?? null,
            'from_address' => $rows['mail.from_address'] ?? null,
            'from_name'    => $rows['mail.from_name']    ?? null,
        ];
    }

    /** Override the runtime mail config from DB settings (called on boot). */
    public static function applyMailConfig(): void
    {
        if (! Schema::hasTable('settings')) {
            return;
        }

        try {
            $m = static::mailConfig();
            if (empty($m['mailer'])) {
                return; // not configured via DB → fall back to .env
            }

            config(['mail.default' => $m['mailer']]);

            if ($m['mailer'] === 'smtp') {
                config([
                    'mail.mailers.smtp.host'       => $m['host'],
                    'mail.mailers.smtp.port'       => $m['port'] !== null ? (int) $m['port'] : 587,
                    'mail.mailers.smtp.username'   => $m['username'] ?: null,
                    'mail.mailers.smtp.password'   => $m['password'] ?: null,
                    'mail.mailers.smtp.encryption' => $m['encryption'] ?: null,
                ]);
            }

            if ($m['from_address']) {
                config(['mail.from.address' => $m['from_address']]);
            }
            if ($m['from_name']) {
                config(['mail.from.name' => $m['from_name']]);
            }
        } catch (\Throwable $e) {
            // Never let a bad mail config break the app boot.
        }
    }
}
