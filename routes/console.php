<?php

use App\Workflow\Jobs\EscalateStaleApprovals;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Workflow SLA escalation — flowchart §4
Schedule::job(new EscalateStaleApprovals)->hourly()->name('approval.escalate');

// Internal audit reminders (H-1 due-soon, H+1 overdue, H+3 escalation)
Schedule::command('audit:run-reminders')->dailyAt('06:00')->name('audit.reminders');

// Calibration nightly check — flowchart §11 (next-due alert in <30d)
Schedule::call(function () {
    \App\Models\Asset::query()
        ->whereBetween('next_calibration_date', [now()->toDateString(), now()->addDays(30)->toDateString()])
        ->each(function ($asset) {
            // hook to your NotifyOwner job
        });
})->dailyAt('06:00')->name('calibration.upcoming');
