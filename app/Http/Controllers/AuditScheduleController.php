<?php

namespace App\Http\Controllers;

use App\Models\AuditSchedule;
use App\Models\User;
use App\Support\Notify;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AuditScheduleController extends Controller
{
    public function show(Request $request, AuditSchedule $schedule): Response
    {
        $schedule->load([
            'leadAuditor:id,name,phone',
            'mr:id,name',
            'sharedBy:id,name',
            'audits' => fn ($q) => $q->with('department:id,name'),
        ]);

        $user = $request->user();

        return Inertia::render('audits/schedule-show', [
            'schedule'       => $schedule,
            'users'          => User::select('id', 'name', 'department_id')->where('status', 'active')->orderBy('name')->get(),
            'departments'    => \App\Models\Department::select('id', 'name')->orderBy('name')->get(),
            'deliveryReport' => $this->deliveryReport($schedule),
            'canApproveMr'   => $user->hasAnyRole(['qmr', 'super_admin']),
            'canShare'       => $user->hasAnyRole(['document_control', 'super_admin']),
            'canEdit'        => $schedule->status === AuditSchedule::STATUS_PENDING_REVIEW,
            // Tombol "Ingatkan via WhatsApp" (wa.me) — target sesuai giliran status jadwal.
            'waReminder'     => $this->buildWaReminder($schedule),
        ]);
    }

    /** Susun data reminder WhatsApp (wa.me) untuk PIC yang gilirannya sesuai status jadwal. */
    private function buildWaReminder(AuditSchedule $schedule): ?array
    {
        [$target, $role, $action] = match ($schedule->status) {
            AuditSchedule::STATUS_PENDING_REVIEW => [$this->firstWithPhoneByRole('qmr'), 'Management Representative', 'meninjau & menyetujui jadwal audit'],
            AuditSchedule::STATUS_APPROVED       => [$this->firstWithPhoneByRole('document_control'), 'Document Control', 'membagikan jadwal audit ke auditee'],
            AuditSchedule::STATUS_REJECTED       => [$schedule->leadAuditor, 'Lead Auditor', 'merevisi & mengajukan ulang jadwal audit'],
            default                              => [null, null, null],
        };

        if (! $role) {
            return null; // shared / status lain — tidak ada aksi tertunda
        }
        if (! $target) {
            return ['role' => $role, 'targetName' => null, 'url' => null, 'reason' => 'user_missing'];
        }

        $phone = \App\Notifications\Channels\FonnteChannel::normalize($target->phone ?? null);
        if (! $phone) {
            return ['role' => $role, 'targetName' => $target->name, 'url' => null, 'reason' => 'no_phone'];
        }

        $link = route('audit-schedules.show', $schedule);
        $msg = "Halo *{$target->name}*,\n\n"
            ."Mohon tindak lanjut jadwal audit internal berikut sebagai *{$role}*:\n\n"
            ."🔖 Kode: *{$schedule->code}*\n"
            .($schedule->period_label ? "📅 Periode: {$schedule->period_label}\n" : '')
            ."🎯 Mohon {$action}.\n\n"
            ."Buka: {$link}\n\n"
            ."_Pesan dari QMS BONECOM TRICOM_";

        return [
            'role'       => $role,
            'targetName' => $target->name,
            'reason'     => null,
            'url'        => 'https://wa.me/'.$phone.'?text='.rawurlencode($msg),
        ];
    }

    /** User pertama (aktif) dengan role tertentu yang punya nomor HP. */
    private function firstWithPhoneByRole(string $role): ?User
    {
        return User::role($role)
            ->where('status', 'active')
            ->whereNotNull('phone')->where('phone', '!=', '')
            ->orderBy('id')->first();
    }

    /** Edit a schedule (header + bagian rows) — only while still pending MR review. */
    public function update(Request $request, AuditSchedule $schedule): RedirectResponse
    {
        abort_unless($schedule->status === AuditSchedule::STATUS_PENDING_REVIEW, 422, 'Jadwal yang sudah direview MR tidak dapat diubah.');

        $data = $request->validate(
            AuditController::scheduleRules(),
            [],
            AuditController::scheduleAttributes(),
        );

        $standards   = array_values($data['standards']);
        $departments = \App\Models\Department::pluck('name', 'id');

        DB::transaction(function () use ($schedule, $data, $standards, $departments) {
            $schedule->update([
                'period_label'    => $data['period_label'] ?? null,
                'standard'        => $standards[0],
                'standards'       => $standards,
                'type'            => $data['type'],
                'lead_auditor_id' => $data['lead_auditor_id'],
                'scope'           => $data['scope'] ?? null,
                'objectives'      => $data['objectives'] ?? null,
                'opening_at'      => $data['opening_at'] ?? null,
                'closing_at'      => $data['closing_at'] ?? null,
                'opening_location'=> $data['opening_location'] ?? null,
                'closing_location'=> $data['closing_location'] ?? null,
                'audit_categories'=> !empty($data['audit_categories']) ? array_values($data['audit_categories']) : null,
            ]);

            // Replace bagian rows (safe while pending review — schedule not yet shared).
            $schedule->audits()->forceDelete();

            foreach ($data['rows'] as $row) {
                $deptName = $row['department_id'] ? ($departments[$row['department_id']] ?? null) : null;
                $title    = trim(($deptName ?: 'Audit').' — '.($data['period_label'] ?: 'Internal Audit'));

                $schedule->audits()->create([
                    'code'            => AuditController::nextAuditCode(),
                    'schedule_group'  => $schedule->code,
                    'title'           => $title,
                    'period_label'    => $data['period_label'] ?? null,
                    'standard'        => $standards[0],
                    'standards'       => $standards,
                    'type'            => $data['type'],
                    'lead_auditor_id' => $data['lead_auditor_id'],
                    'scope'           => $data['scope'] ?? null,
                    'objectives'      => $data['objectives'] ?? null,
                    'department_id'   => $row['department_id'] ?? null,
                    'location'        => $row['location'] ?? null,
                    'planned_date'    => $row['planned_date'],
                    'jam_pelaksanaan' => $row['jam_pelaksanaan'] ?? null,
                    'team'            => array_values(array_filter($row['team'] ?? [])),
                    'auditees'        => array_values(array_filter($row['auditees'] ?? [])),
                    'processes'       => AuditController::cleanProcesses($row['processes'] ?? []),
                    'status'          => 'scheduled',
                ]);
            }
        });

        return back()->with('flash.success', "Jadwal {$schedule->code} diperbarui.");
    }

    /** Management Representative review & approval (sign). */
    public function approve(Request $request, AuditSchedule $schedule): RedirectResponse
    {
        abort_unless($request->user()->hasAnyRole(['qmr', 'super_admin']), 403, 'Hanya Management Representative yang dapat menyetujui jadwal.');
        abort_unless($schedule->status === AuditSchedule::STATUS_PENDING_REVIEW, 422, 'Jadwal tidak dalam status menunggu review.');

        $note = $request->validate(['note' => ['nullable', 'string', 'max:2000']])['note'] ?? null;

        $schedule->update([
            'status'       => AuditSchedule::STATUS_APPROVED,
            'mr_user_id'   => $request->user()->id,
            'mr_signed_at' => now(),
            'mr_note'      => $note,
        ]);

        $schedUrl = route('audit-schedules.show', $schedule, false);
        Notify::many(User::role('document_control')->get(), 'Jadwal audit siap dibagikan',
            "{$schedule->code}: disetujui Management Representative. Silakan bagikan ke auditee.", $schedUrl, 'action');
        Notify::to(User::find($schedule->lead_auditor_id), 'Jadwal audit disetujui',
            "{$schedule->code}: telah disetujui MR & menunggu dibagikan Document Control.", $schedUrl, 'success');

        return back()->with('flash.success', 'Jadwal disetujui & ditandatangani MR. Document Control dapat membagikan ke email.');
    }

    public function reject(Request $request, AuditSchedule $schedule): RedirectResponse
    {
        abort_unless($request->user()->hasAnyRole(['qmr', 'super_admin']), 403);
        abort_unless($schedule->status === AuditSchedule::STATUS_PENDING_REVIEW, 422);

        $note = $request->validate(['note' => ['required', 'string', 'max:2000']])['note'];

        $schedule->update([
            'status'       => AuditSchedule::STATUS_REJECTED,
            'mr_user_id'   => $request->user()->id,
            'mr_signed_at' => now(),
            'mr_note'      => $note,
        ]);

        Notify::to(User::find($schedule->lead_auditor_id), 'Jadwal audit ditolak',
            "{$schedule->code}: {$note} — silakan revisi & ajukan ulang.",
            route('audit-schedules.show', $schedule, false), 'warning');

        return back()->with('flash.success', 'Jadwal ditolak. Auditor dapat merevisi & submit ulang.');
    }

    /** Document Control shares the approved schedule to auditees via email. */
    public function share(Request $request, AuditSchedule $schedule): RedirectResponse
    {
        abort_unless($request->user()->hasAnyRole(['document_control', 'super_admin']), 403, 'Hanya Document Control yang dapat membagikan jadwal.');
        abort_unless($schedule->status === AuditSchedule::STATUS_APPROVED, 422, 'Jadwal harus disetujui MR terlebih dahulu.');

        // Approved schedule PDF (with MR signature) — attached to every notification email.
        $pdfData = static::renderPdf($schedule)->output();
        $pdfName = "Jadwal-Audit-Internal-{$schedule->code}.pdf";

        $results = [];
        foreach ($schedule->audits as $audit) {
            $results = array_merge($results, AuditController::sendScheduleNotification($audit, $pdfData, $pdfName));
        }

        $schedule->update([
            'status'    => AuditSchedule::STATUS_SHARED,
            'shared_by' => $request->user()->id,
            'shared_at' => now(),
        ]);

        // In-app: beri tahu auditee & tim auditor bahwa jadwal telah dibagikan.
        $uids = collect($schedule->audits)
            ->flatMap(fn ($a) => array_merge((array) ($a->auditees ?? []), (array) ($a->team ?? [])))
            ->filter()->unique()->values();
        Notify::many(User::whereIn('id', $uids)->get(), 'Jadwal audit dibagikan',
            "{$schedule->code}: Anda terjadwal audit internal. Lihat detail & jadwal.",
            route('audit-schedules.show', $schedule, false), 'info');

        [$key, $msg] = $this->deliverySummary($results);

        return back()->with($key, $msg);
    }

    /** Re-send the schedule email — only to recipients that have NOT received it yet (fixes/late deliveries). */
    public function resend(Request $request, AuditSchedule $schedule): RedirectResponse
    {
        abort_unless($request->user()->hasAnyRole(['document_control', 'super_admin']), 403, 'Hanya Document Control yang dapat mengirim ulang jadwal.');
        abort_unless($schedule->status === AuditSchedule::STATUS_SHARED, 422, 'Jadwal harus sudah dibagikan sebelum dapat dikirim ulang.');

        $pdfData = static::renderPdf($schedule)->output();
        $pdfName = "Jadwal-Audit-Internal-{$schedule->code}.pdf";

        $results = [];
        foreach ($schedule->audits as $audit) {
            // Addresses already delivered on any previous send for this audit — skip so we don't double-mail them.
            $already = \App\Models\AuditNotification::where('subject_type', \App\Models\Audit::class)
                ->where('subject_id', $audit->id)
                ->where('type', 'audit.scheduled')
                ->pluck('recipients')
                ->flatten()->filter()->unique()->values()->all();

            $results = array_merge($results, AuditController::sendScheduleNotification($audit, $pdfData, $pdfName, $already));
        }

        [$key, $msg] = $this->deliverySummary($results, true);

        return back()->with($key, $msg);
    }

    /** Build a flash [key, message] summarising per-address delivery outcome. */
    private function deliverySummary(array $results, bool $isResend = false): array
    {
        $byEmail = [];
        foreach ($results as $r) {
            $k = $r['email'] ?? ('x:'.$r['name']);
            // A failure for an address always wins over an earlier success/skip so problems surface.
            if (!isset($byEmail[$k]) || $r['status'] === 'failed') $byEmail[$k] = $r;
        }
        $collection = collect($byEmail);
        $sent   = $collection->where('status', 'sent')->pluck('email')->filter()->values();
        $failed = $collection->where('status', 'failed');

        if ($sent->isEmpty() && $failed->isEmpty()) {
            return ['flash.success', 'Tidak ada penerima baru yang perlu dikirimi email (semua sudah menerima sebelumnya).'];
        }

        $lead = $isResend ? 'Kirim ulang selesai.' : 'Jadwal dibagikan.';

        if ($failed->isEmpty()) {
            return ['flash.success', "{$lead} Email terkirim ke {$sent->count()} penerima: ".$sent->implode(', ')];
        }

        $flist = $failed->map(fn ($r) => ($r['email'] ?? $r['name']))->implode(', ');
        return ['flash.error', "{$lead} Terkirim {$sent->count()}, GAGAL {$failed->count()}: {$flist}. Lihat Delivery Report di halaman ini."];
    }

    /**
     * Aggregate per-address delivery status across all notification logs of this schedule's audits.
     * One row per email; status upgrades sent > failed > skipped (a delivered address stays "sent").
     *
     * @return array<int, array{email:?string, name:string, role:string, status:string, error:?string}>
     */
    private function deliveryReport(AuditSchedule $schedule): array
    {
        $auditIds = $schedule->relationLoaded('audits')
            ? $schedule->audits->pluck('id')
            : $schedule->audits()->pluck('id');

        if ($auditIds->isEmpty()) return [];

        $logs = \App\Models\AuditNotification::where('subject_type', \App\Models\Audit::class)
            ->whereIn('subject_id', $auditIds)
            ->where('type', 'audit.scheduled')
            ->orderBy('created_at')
            ->get();

        $rank = ['skipped' => 0, 'failed' => 1, 'sent' => 2];
        $agg  = [];

        foreach ($logs as $log) {
            foreach (($log->results ?? []) as $r) {
                $key = $r['email'] ?? ('noemail:'.($r['name'] ?? ''));
                $cur = $agg[$key] ?? null;
                if (!$cur || ($rank[$r['status']] ?? 0) >= ($rank[$cur['status']] ?? 0)) {
                    $agg[$key] = $r;
                }
            }
        }

        return array_values($agg);
    }

    public function previewPdf(AuditSchedule $schedule): HttpResponse
    {
        return static::renderPdf($schedule)->stream("{$schedule->code}.pdf", ['Attachment' => false]);
    }

    /** Build the approved audit-schedule PDF (shared by preview + email attachment). */
    public static function renderPdf(AuditSchedule $schedule): \Barryvdh\DomPDF\PDF
    {
        $schedule->load([
            'leadAuditor:id,name',
            'mr:id,name,signature_path',
            'audits' => fn ($q) => $q->with('department:id,name,manager_id'),
        ]);

        // Resolve auditor + manager names for the schedule table / "Mengetahui" block.
        $userIds = collect();
        foreach ($schedule->audits as $a) {
            $userIds = $userIds->merge($a->team ?? []);
        }
        $managerIds = $schedule->audits->pluck('department.manager_id')->filter()->unique();
        $names = User::whereIn('id', $userIds->merge($managerIds)->filter()->unique())
            ->pluck('name', 'id');

        return Pdf::loadView('audits.schedule-pdf', [
            'schedule' => $schedule,
            'names'    => $names,
        ])->setPaper('a4', 'landscape')->setOption('isRemoteEnabled', true);
    }
}
