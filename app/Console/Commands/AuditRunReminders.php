<?php

namespace App\Console\Commands;

use App\Models\AuditFinding;
use App\Models\User;
use App\Notifications\Audit\FindingReminderNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class AuditRunReminders extends Command
{
    protected $signature = 'audit:run-reminders';
    protected $description = 'Send H-1 due-soon, H+1 overdue, and H+3 escalation reminders for audit findings.';

    public function handle(): int
    {
        $today = now()->startOfDay();

        // H-1 — due tomorrow
        $dueTomorrow = AuditFinding::with('owner.department.manager', 'audit')
            ->whereNotIn('status', [AuditFinding::STATUS_CLOSED, AuditFinding::STATUS_REJECTED])
            ->whereDate('due_date', $today->copy()->addDay()->toDateString())
            ->get();

        foreach ($dueTomorrow as $f) {
            $this->fire($f, FindingReminderNotification::KIND_DUE_SOON);
        }

        // H+1 — 1 day overdue
        $overdue1 = AuditFinding::with('owner.department.manager', 'audit')
            ->whereNotIn('status', [AuditFinding::STATUS_CLOSED, AuditFinding::STATUS_REJECTED])
            ->whereDate('due_date', $today->copy()->subDay()->toDateString())
            ->get();

        foreach ($overdue1 as $f) {
            $this->fire($f, FindingReminderNotification::KIND_OVERDUE);
        }

        // H+3 — 3 days overdue → escalation (cc manager + director)
        $overdue3 = AuditFinding::with('owner.department.manager', 'audit')
            ->whereNotIn('status', [AuditFinding::STATUS_CLOSED, AuditFinding::STATUS_REJECTED])
            ->whereDate('due_date', $today->copy()->subDays(3)->toDateString())
            ->get();

        foreach ($overdue3 as $f) {
            $this->fire($f, FindingReminderNotification::KIND_ESCALATION, escalate: true);
        }

        $this->info("Sent: {$dueTomorrow->count()} H-1, {$overdue1->count()} H+1, {$overdue3->count()} H+3.");
        return self::SUCCESS;
    }

    private function fire(AuditFinding $f, string $kind, bool $escalate = false): void
    {
        if (!$f->owner) return;
        try {
            $to = [$f->owner];
            $cc = collect();
            if ($manager = $f->owner->department?->manager) {
                $cc->push($manager);
            }
            if ($escalate) {
                $cc = $cc->merge(User::role(['qmr', 'director'])->get());
            }
            $cc = $cc->unique('id')->reject(fn ($u) => $u->id === $f->owner->id);

            Notification::send($to, new FindingReminderNotification($f, $kind));
            if ($cc->isNotEmpty()) {
                Notification::send($cc, new FindingReminderNotification($f, $kind));
            }

            FindingReminderNotification::log(
                $f,
                $kind,
                collect($to)->pluck('email')->all(),
                $cc->pluck('email')->all(),
            );
        } catch (\Throwable $e) {
            Log::error("audit:run-reminders failed for finding {$f->id}: ".$e->getMessage());
        }
    }
}
