<?php

namespace App\Models\Concerns;

use DateTimeInterface;
use Illuminate\Support\Carbon;

/**
 * Force Eloquent to serialize datetimes in the app's local timezone (Asia/Jakarta)
 * so the Inertia frontend renders Jakarta time instead of UTC.
 *
 * Output format: `2026-05-28T22:14:46+07:00` (ISO 8601 with offset).
 */
trait SerializesLocalDates
{
    protected function serializeDate(DateTimeInterface $date): string
    {
        return Carbon::instance($date)
            ->setTimezone(config('app.timezone'))
            ->format('Y-m-d\TH:i:sP');
    }
}
