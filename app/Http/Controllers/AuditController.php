<?php

namespace App\Http\Controllers;

use App\Exports\AuditFindingRecapExport;
use App\Models\Audit;
use App\Models\AuditFinding;
use App\Models\AuditNotification;
use App\Models\Department;
use App\Models\User;
use App\Notifications\Audit\AuditScheduledNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditController extends Controller
{
    /**
     * Audit yang boleh dilihat user, sebagai query yang bisa dilanjutkan.
     *
     * Lead Auditor / Document Control / QMR / Administrator melihat semua jadwal.
     * Auditee (lainnya) hanya melihat audit departemennya sendiri atau yang melibatkan dirinya.
     * Dipakai bersama oleh daftar audit dan export rekap temuan agar batas akses
     * keduanya tidak mungkin berbeda.
     */
    private function visibleAudits(User $user): Builder
    {
        $seeAll = $user->hasAnyRole(['super_admin', 'qmr', 'document_control'])
            || Audit::where('lead_auditor_id', $user->id)->orWhere('actual_lead_auditor_id', $user->id)->exists();

        // Jadwal yang di dalamnya user bertindak sebagai AUDITOR (lead atau anggota tim di bagian mana pun).
        // Auditor terkait boleh melihat seluruh bagian jadwal tsb — auditee tetap dibatasi departemennya.
        // Rencana maupun aktual sama-sama dihitung: auditor yang digantikan tetap boleh
        // melihat audit yang sempat ia pegang, sedangkan penggantinya langsung mendapat akses.
        $auditorScheduleIds = $seeAll ? [] : Audit::where(function ($x) use ($user) {
                $x->where('lead_auditor_id', $user->id)
                  ->orWhere('actual_lead_auditor_id', $user->id)
                  ->orWhereJsonContains('team', $user->id)
                  ->orWhereJsonContains('actual_team', $user->id);
            })
            ->whereNotNull('audit_schedule_id')
            ->pluck('audit_schedule_id')->unique()->values()->all();

        return Audit::query()
            ->when(! $seeAll, fn ($q) => $q->where(function ($x) use ($user, $auditorScheduleIds) {
                $x->where('department_id', $user->department_id)       // sebagai auditee: departemennya
                  ->orWhereJsonContains('auditees', $user->id)          // dirinya ditunjuk sebagai auditee
                  ->orWhere('lead_auditor_id', $user->id)               // dirinya lead auditor bagian
                  ->orWhere('actual_lead_auditor_id', $user->id)        // dirinya lead auditor pelaksana
                  ->orWhereJsonContains('team', $user->id)              // dirinya auditor bagian
                  ->orWhereJsonContains('actual_team', $user->id)       // dirinya auditor pelaksana
                  ->orWhereIn('audit_schedule_id', $auditorScheduleIds); // seluruh jadwal yang ia auditori
            }));
    }

    /** Filter daftar audit (pencarian kode/judul, standar, status) — sama untuk daftar & export. */
    private function applyAuditFilters(Builder $query, Request $request): Builder
    {
        return $query
            ->when($request->q, fn ($q, $term) => $q->where(function ($x) use ($term) {
                $x->where('code', 'like', "%{$term}%")
                  ->orWhere('title', 'like', "%{$term}%");
            }))
            ->when($request->standard, fn ($q, $s) => $q->where('standard', $s))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->department, fn ($q, $d) => $q->where('department_id', $d));
    }

    public function index(Request $request): Response
    {
        $user = $request->user();

        $audits = $this->applyAuditFilters($this->visibleAudits($user), $request)
            ->with(['leadAuditor:id,name', 'department:id,name'])
            ->withCount([
                'findings as findings_pfi'     => fn ($q) => $q->where('category', AuditFinding::CAT_PFI),
                'findings as findings_minor'   => fn ($q) => $q->where('category', AuditFinding::CAT_MINOR),
                'findings as findings_major'   => fn ($q) => $q->where('category', AuditFinding::CAT_MAJOR),
                'findings as findings_open'    => fn ($q) => $q->whereNotIn('status', ['closed', 'rejected']),
                'findings as findings_overdue' => fn ($q) => $q->whereNotIn('status', ['closed', 'rejected'])
                    ->whereDate('due_date', '<', now()->toDateString()),
            ])
            ->orderByDesc('planned_date')
            ->paginate(20)
            ->withQueryString();

        // KPIs for dashboard tiles
        $now = now();
        $kpis = [
            'this_month'       => Audit::whereYear('planned_date', $now->year)->whereMonth('planned_date', $now->month)->count(),
            'overdue'          => AuditFinding::overdue()->count(),
            'findings_open'    => AuditFinding::whereNotIn('status', ['closed', 'rejected'])->count(),
            'findings_closed'  => AuditFinding::where('status', 'closed')->whereYear('closed_at', $now->year)->count(),
            'awaiting_approval'=> AuditFinding::where('status', AuditFinding::STATUS_WAITING_APPROVAL)->count(),
        ];

        // Distribusi temuan per departemen untuk mini-chart.
        // Dibatasi ke audit yang boleh dilihat user: baris ini sekarang bisa
        // diklik untuk memfilter daftar, jadi angkanya harus konsisten dengan
        // isi daftar setelah difilter.
        $matrix = AuditFinding::query()
            ->whereIn('audit_findings.audit_id', $this->visibleAudits($user)->select('audits.id'))
            ->join('audits', 'audits.id', '=', 'audit_findings.audit_id')
            ->leftJoin('departments', 'departments.id', '=', 'audits.department_id')
            ->selectRaw('audits.department_id as department_id')
            ->selectRaw('COALESCE(departments.name, "Tanpa Departemen") as dept')
            ->selectRaw('SUM(CASE WHEN audit_findings.category = ? THEN 1 ELSE 0 END) as pfi', [AuditFinding::CAT_PFI])
            ->selectRaw('SUM(CASE WHEN audit_findings.category = ? THEN 1 ELSE 0 END) as minor', [AuditFinding::CAT_MINOR])
            ->selectRaw('SUM(CASE WHEN audit_findings.category = ? THEN 1 ELSE 0 END) as major', [AuditFinding::CAT_MAJOR])
            ->groupBy('audits.department_id', 'dept')
            ->get()
            ->map(fn ($r) => [
                'id'    => $r->department_id ? (int) $r->department_id : null,
                'name'  => $r->dept,
                'pfi'   => (int) $r->pfi,
                'minor' => (int) $r->minor,
                'major' => (int) $r->major,
                'total' => (int) $r->pfi + (int) $r->minor + (int) $r->major,
            ])
            ->sortByDesc('total')
            ->values();

        return Inertia::render('audits/index', [
            'audits'      => $audits,
            'kpis'        => $kpis,
            'matrix'      => $matrix,
            'filters'     => $request->only(['q', 'standard', 'status', 'department']),
            'departments' => Department::select('id', 'name')->orderBy('name')->get(),
            'users'       => User::select('id', 'name', 'department_id')->where('status', 'active')->orderBy('name')->get(),
            // Hanya Document Control & Administrator yang boleh menghapus jadwal dari daftar.
            'canDelete'   => $user->hasAnyRole(['document_control', 'super_admin']),
        ]);
    }

    /**
     * Unduh rekapitulasi temuan (FM-BDK-009) sebagai file Excel.
     *
     * `ids` = audit yang dicentang user; bila kosong, seluruh audit yang lolos
     * filter daftar saat ini yang diekspor. Cakupan audit selalu dibatasi ulang
     * lewat visibleAudits() sehingga id milik departemen lain tidak bisa ditembus
     * hanya dengan menyusun query string sendiri.
     */
    public function exportFindings(Request $request): StreamedResponse|RedirectResponse
    {
        $data = $request->validate([
            'ids'      => ['nullable', 'array', 'max:500'],
            'ids.*'    => ['integer'],
            'q'          => ['nullable', 'string', 'max:255'],
            'standard'   => ['nullable', 'string', 'max:32'],
            'status'     => ['nullable', 'string', 'max:32'],
            'department' => ['nullable', 'integer'],
        ]);

        $query = $this->visibleAudits($request->user());

        if (! empty($data['ids'])) {
            $query->whereIn('id', $data['ids']);
        } else {
            $this->applyAuditFilters($query, $request);
        }

        $audits = $query->orderBy('planned_date')->orderBy('code')->get();

        if ($audits->isEmpty()) {
            return back()->with('flash.error', 'Tidak ada audit yang dapat diekspor untuk pilihan/filter ini.');
        }

        $export = AuditFindingRecapExport::forAudits($audits);
        $book   = $export->build();

        return response()->streamDownload(
            function () use ($book) {
                (new Xlsx($book))->save('php://output');
            },
            $export->filename(),
            [
                'Content-Type'  => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Cache-Control' => 'no-store, no-cache, must-revalidate',
            ],
        );
    }

    public function show(Audit $audit): Response
    {
        $audit->load([
            'schedule:id,code,status',
            'leadAuditor:id,name,email',
            'actualLeadAuditor:id,name,email',
            'auditorChangedBy:id,name',
            'department:id,name',
            'findings.owner:id,name,department_id',
            'findings.approver:id,name',
            'findings.verifier:id,name',
            'notifications' => fn ($q) => $q->latest()->limit(30),
        ]);

        $uid = auth()->id();

        return Inertia::render('audits/show', [
            'audit' => $audit,
            'team'  => User::whereIn('id', $audit->team ?? [])->select('id', 'name')->get(),
            // Tim auditor pelaksana; null bila belum pernah dicatat perubahannya.
            'actualTeam' => $audit->actual_team === null
                ? null
                : User::whereIn('id', $audit->actual_team)->select('id', 'name')->get(),
            'users' => User::select('id', 'name', 'department_id')->where('status', 'active')->orderBy('name')->get(),
            // Hanya auditor PELAKSANA (lead atau anggota tim aktual) yang boleh menambah
            // temuan — auditor yang sudah digantikan tidak lagi berwenang.
            'canAddFinding' => in_array($uid, $audit->effectiveAuditorIds(), true)
                || auth()->user()->hasRole('super_admin'),
            // Pencatatan auditor aktual adalah kewenangan Document Control & Administrator.
            'canEditActualAuditor' => auth()->user()->hasAnyRole(['document_control', 'super_admin']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        // Gate: only roles granted the `audit.create` permission (Role & Permission page)
        // may create an audit schedule.
        abort_unless($request->user()->can('audit.create'), 403, 'Anda tidak memiliki izin untuk membuat jadwal audit.');

        // FM-BDK-007 schedule: shared header (period + lead auditor, filled once) plus
        // one row per bagian. Each row becomes its own Audit sharing the schedule_group.
        $data = $request->validate($this->scheduleRules(), [], $this->scheduleAttributes());

        $departments = Department::pluck('name', 'id');
        $standards   = array_values($data['standards']);

        // Nomor urut dibuat di dalam transaksi agar dua submit bersamaan tidak
        // memakai kode yang sama; bila tetap bentrok, diulang dengan nomor baru.
        $schedule = $this->retryOnDuplicateCode(fn () => DB::transaction(function () use ($data, $departments, $standards, $request) {
            $scheduleGroup = $this->nextScheduleGroup();

            // Parent schedule — created in pending_review; email deferred until DC shares.
            $schedule = \App\Models\AuditSchedule::create([
                'code'            => $scheduleGroup,
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
                'status'          => \App\Models\AuditSchedule::STATUS_PENDING_REVIEW,
                'created_by'      => $request->user()->id,
            ]);

            foreach ($data['rows'] as $row) {
                $deptName = $row['department_id'] ? ($departments[$row['department_id']] ?? null) : null;
                $title    = trim(($deptName ?: 'Audit').' — '.($data['period_label'] ?: 'Internal Audit'));

                Audit::create([
                    'code'              => $this->nextCode(),
                    'schedule_group'    => $scheduleGroup,
                    'audit_schedule_id' => $schedule->id,
                    'title'             => $title,
                    'period_label'      => $data['period_label'] ?? null,
                    'standard'          => $standards[0],
                    'standards'         => $standards,
                    'type'              => $data['type'],
                    'lead_auditor_id'   => $data['lead_auditor_id'],
                    'scope'             => $data['scope'] ?? null,
                    'objectives'        => $data['objectives'] ?? null,
                    'department_id'     => $row['department_id'] ?? null,
                    'location'          => $row['location'] ?? null,
                    'planned_date'      => $row['planned_date'],
                    'jam_pelaksanaan'   => $row['jam_pelaksanaan'] ?? null,
                    'team'              => array_values(array_filter($row['team'] ?? [])),
                    'auditees'          => array_values(array_filter($row['auditees'] ?? [])),
                    'cc_user_ids'       => array_values(array_filter($row['cc_user_ids'] ?? [])),
                    'processes'         => self::cleanProcesses($row['processes'] ?? []),
                    'status'            => 'scheduled',
                ]);
            }

            return $schedule;
        }));

        return redirect()->route('audit-schedules.show', $schedule)
            ->with('flash.success', "Jadwal {$schedule->code} dibuat. Menunggu review & approval Management Representative sebelum dibagikan.");
    }

    /**
     * Validation rules for the FM-BDK-007 schedule form (create & edit).
     * All visible columns are mandatory.
     */
    public static function scheduleRules(): array
    {
        return [
            'period_label'              => ['required', 'string', 'max:255'],
            'standards'                 => ['required', 'array', 'min:1'],
            'standards.*'               => ['in:iso_9001,iso_14001,iso_45001,iatf,internal'],
            'type'                      => ['required', 'in:internal,external,surveillance,recertification'],
            'lead_auditor_id'           => ['required', 'exists:users,id'],
            'scope'                     => ['required', 'string', 'max:5000'],
            'objectives'                => ['required', 'string', 'max:5000'],
            'opening_at'                => ['nullable', 'date'],
            'closing_at'                => ['nullable', 'date'],
            'opening_location'          => ['nullable', 'string', 'max:255'],
            'closing_location'          => ['nullable', 'string', 'max:255'],
            'audit_categories'          => ['nullable', 'array'],
            'audit_categories.*'        => ['in:sistem,proses,produk'],
            'rows'                      => ['required', 'array', 'min:1'],
            'rows.*.department_id'      => ['required', 'exists:departments,id'],
            'rows.*.location'           => ['required', 'string', 'max:255'],
            'rows.*.planned_date'       => ['required', 'date'],
            'rows.*.jam_pelaksanaan'    => ['required', 'string', 'max:64'],
            'rows.*.team'               => ['required', 'array', 'min:1'],
            'rows.*.team.*'             => ['integer', 'exists:users,id'],
            'rows.*.auditees'           => ['required', 'array', 'min:1'],
            'rows.*.auditees.*'         => ['integer', 'exists:users,id'],
            'rows.*.processes'          => ['required', 'array', 'min:1'],
            'rows.*.processes.*.proses' => ['required', 'string', 'max:255'],
            'rows.*.processes.*.related_documents'   => ['required', 'array', 'min:1'],
            'rows.*.processes.*.related_documents.*' => ['required', 'string', 'max:1000'],
        ];
    }

    /** Friendly Indonesian field names for the schedule validation messages. */
    public static function scheduleAttributes(): array
    {
        return [
            'period_label'     => 'Periode',
            'standards'        => 'Standar',
            'lead_auditor_id'  => 'Lead Auditor',
            'scope'            => 'Scope',
            'objectives'       => 'Objektif',
            'opening_at'       => 'Jadwal Opening',
            'closing_at'       => 'Jadwal Closing',
            'opening_location' => 'Lokasi Opening',
            'closing_location' => 'Lokasi Closing',
            'audit_categories' => 'Jenis Audit',
            'rows.*.department_id'   => 'Bagian/Departemen',
            'rows.*.location'        => 'Lokasi',
            'rows.*.planned_date'    => 'Tanggal',
            'rows.*.jam_pelaksanaan' => 'Jam Pelaksanaan',
            'rows.*.team'            => 'Tim Auditor',
            'rows.*.auditees'        => 'Auditee',
            'rows.*.processes'       => 'Proses',
            'rows.*.processes.*.proses' => 'Nama Proses',
            'rows.*.processes.*.related_documents' => 'Related Document',
        ];
    }

    /**
     * Drop blank proses rows; keep only those with a process name or related docs.
     * `related_documents` is normalised to a list of strings (1 proses → multi related document).
     * Accepts legacy string input (newline-separated) for backward compatibility.
     */
    public static function cleanProcesses(array $rows): array
    {
        return array_values(array_filter(array_map(function ($p) {
            $rd = $p['related_documents'] ?? [];
            if (is_string($rd)) {
                $rd = preg_split('/\r\n|\r|\n/', $rd) ?: [];
            }
            $rd = array_values(array_filter(
                array_map(fn ($x) => trim((string) $x), (array) $rd),
                fn ($x) => $x !== '',
            ));

            return [
                'proses'            => trim((string) ($p['proses'] ?? '')),
                'related_documents' => $rd,
            ];
        }, $rows), fn ($p) => $p['proses'] !== '' || ! empty($p['related_documents'])));
    }

    public function update(Request $request, Audit $audit): RedirectResponse
    {
        abort_unless($request->user()->can('audit.update'), 403, 'Anda tidak memiliki izin untuk mengubah data audit.');

        $data = $this->validateAudit($request);
        $audit->update($data);

        if ($request->boolean('renotify')) {
            $this->sendScheduleNotification($audit);
        }

        return back()->with('flash.success', "{$audit->code} updated.");
    }

    /**
     * Catat auditor AKTUAL (realisasi) untuk satu bagian audit.
     *
     * Auditor rencana pada jadwal FM-BDK-007 yang sudah disetujui MR sengaja tidak
     * disentuh — penggantian auditor di lapangan disimpan di kolom terpisah supaya
     * dokumen terkendali tetap utuh dan jejak rencana→realisasi terbaca.
     */
    public function updateActualAuditors(Request $request, Audit $audit): RedirectResponse
    {
        abort_unless(
            $request->user()->hasAnyRole(['document_control', 'super_admin']),
            403,
            'Hanya Document Control atau Administrator yang dapat mengubah auditor aktual.'
        );

        // Batalkan pencatatan — audit kembali mengikuti auditor pada jadwal.
        if ($request->boolean('reset')) {
            $audit->update([
                'actual_lead_auditor_id' => null,
                'actual_team'            => null,
                'auditor_change_reason'  => null,
                'auditor_changed_at'     => null,
                'auditor_changed_by'     => null,
            ]);

            return back()->with('flash.success', "Auditor {$audit->code} dikembalikan mengikuti jadwal.");
        }

        $data = $request->validate([
            'actual_lead_auditor_id' => ['nullable', 'exists:users,id'],
            'actual_team'            => ['present', 'array'],
            'actual_team.*'          => ['integer', 'distinct', 'exists:users,id'],
            'reason'                 => ['required', 'string', 'max:1000'],
        ], [], [
            'actual_lead_auditor_id' => 'lead auditor aktual',
            'actual_team'            => 'tim auditor aktual',
            'reason'                 => 'alasan perubahan',
        ]);

        $lead = $data['actual_lead_auditor_id'] ? (int) $data['actual_lead_auditor_id'] : null;

        // Lead auditor tidak dicatat ulang sebagai anggota tim — ganda di laporan.
        $team = collect($data['actual_team'])
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id !== $lead)
            ->unique()->values()->all();

        $audit->update([
            'actual_lead_auditor_id' => $lead,
            'actual_team'            => $team,
            'auditor_change_reason'  => $data['reason'],
            'auditor_changed_at'     => now(),
            'auditor_changed_by'     => $request->user()->id,
        ]);

        return back()->with('flash.success', "Auditor aktual {$audit->code} diperbarui.");
    }

    public function destroy(Request $request, Audit $audit): RedirectResponse
    {
        abort_unless(
            $request->user()->hasAnyRole(['document_control', 'super_admin']),
            403,
            'Hanya Document Control atau Administrator yang dapat menghapus jadwal audit.'
        );

        $code = $audit->code;
        // Hapus temuan (event ikut ter-cascade) lalu audit-nya.
        $audit->findings()->delete();
        $audit->delete();

        return redirect()->route('audits.index')->with('flash.success', "{$code} dihapus.");
    }

    public function transition(Request $request, Audit $audit): RedirectResponse
    {
        $data = $request->validate([
            'to' => ['required', 'in:scheduled,in_progress,reporting,closed,cancelled'],
        ]);

        $patch = ['status' => $data['to']];
        if ($data['to'] === 'in_progress' && !$audit->actual_start_date) {
            $patch['actual_start_date'] = now()->toDateString();
        }
        if ($data['to'] === 'closed' && !$audit->actual_end_date) {
            $patch['actual_end_date'] = now()->toDateString();
        }
        $audit->update($patch);

        return back()->with('flash.success', "Audit {$audit->code} moved to {$data['to']}.");
    }

    private function validateAudit(Request $request): array
    {
        $data = $request->validate([
            'title'                  => ['required', 'string', 'max:255'],
            'period_label'           => ['nullable', 'string', 'max:255'],
            'standard'               => ['required', 'in:iso_9001,iso_14001,iso_45001,iatf,internal'],
            'type'                   => ['required', 'in:internal,external,surveillance,recertification'],
            'department_id'          => ['nullable', 'exists:departments,id'],
            'location'               => ['nullable', 'string', 'max:255'],
            'lead_auditor_id'        => ['required', 'exists:users,id'],
            'team'                   => ['nullable', 'array'],
            'team.*'                 => ['integer', 'exists:users,id'],
            'auditees'               => ['nullable', 'array'],
            'auditees.*'             => ['integer', 'exists:users,id'],
            'cc_user_ids'            => ['nullable', 'array'],
            'cc_user_ids.*'          => ['integer', 'exists:users,id'],
            'planned_date'           => ['required', 'date'],
            'jam_pelaksanaan'        => ['nullable', 'string', 'max:64'],
            'scope'                  => ['nullable', 'string', 'max:5000'],
            'objectives'             => ['nullable', 'string', 'max:5000'],
            'processes'              => ['nullable', 'array'],
            'processes.*.proses'     => ['nullable', 'string', 'max:255'],
            'processes.*.related_documents'   => ['nullable', 'array'],
            'processes.*.related_documents.*' => ['nullable', 'string', 'max:1000'],
        ]);

        if (array_key_exists('processes', $data)) {
            $data['processes'] = self::cleanProcesses($data['processes'] ?? []);
        }

        return $data;
    }

    /**
     * Send the schedule email to every stakeholder of an audit — auditees, AUDITORS (team),
     * and CC (auditee managers + custom cc list). Each recipient is mailed individually so one
     * bad address can't block the rest, and the per-address delivery status is captured & returned.
     *
     * @param  string[]  $skipEmails  Addresses to skip (e.g. already delivered on a previous send).
     * @return array<int, array{email:?string, name:string, role:string, status:string, error:?string}>
     */
    public static function sendScheduleNotification(Audit $audit, ?string $pdfData = null, ?string $pdfName = null, array $skipEmails = []): array
    {
        $audit->loadMissing(['leadAuditor', 'department']);

        $auditeeUsers = User::whereIn('id', $audit->auditees ?? [])->get();
        $auditorUsers = User::whereIn('id', $audit->team ?? [])->get();      // auditors — were previously never notified

        // CC: auditees' managers + custom cc list
        $ccUsers = User::whereIn('id', $audit->cc_user_ids ?? [])->get();
        $managerIds = Department::whereIn('id', $auditeeUsers->pluck('department_id')->filter()->unique())
            ->pluck('manager_id')->filter()->unique();
        if ($managerIds->isNotEmpty()) {
            $ccUsers = $ccUsers->merge(User::whereIn('id', $managerIds)->get());
        }

        // One entry per unique user; role priority auditee > auditor > cc when someone appears twice.
        $recipients = [];
        foreach ($ccUsers as $u)      { $recipients[$u->id] = ['user' => $u, 'role' => 'cc']; }
        foreach ($auditorUsers as $u) { $recipients[$u->id] = ['user' => $u, 'role' => 'auditor']; }
        foreach ($auditeeUsers as $u) { $recipients[$u->id] = ['user' => $u, 'role' => 'auditee']; }

        $skip    = array_map('strtolower', $skipEmails);
        $results = [];

        foreach ($recipients as $entry) {
            $u = $entry['user']; $role = $entry['role']; $email = $u->email;

            if (empty($email)) {
                $results[] = ['email' => null, 'name' => $u->name, 'role' => $role, 'status' => 'failed', 'error' => 'User tidak memiliki alamat email.'];
                continue;
            }
            if (in_array(strtolower($email), $skip, true)) {
                $results[] = ['email' => $email, 'name' => $u->name, 'role' => $role, 'status' => 'skipped', 'error' => null];
                continue;
            }
            try {
                Notification::send(collect([$u]), new AuditScheduledNotification($audit, $pdfData, $pdfName));
                $results[] = ['email' => $email, 'name' => $u->name, 'role' => $role, 'status' => 'sent', 'error' => null];
            } catch (\Throwable $e) {
                $results[] = ['email' => $email, 'name' => $u->name, 'role' => $role, 'status' => 'failed', 'error' => $e->getMessage()];
            }
        }

        $sent   = collect($results)->where('status', 'sent')->pluck('email')->filter()->values()->all();
        $failed = collect($results)->where('status', 'failed')->pluck('email')->filter()->values()->all();

        AuditNotification::create([
            'subject_type' => Audit::class,
            'subject_id'   => $audit->id,
            'type'         => 'audit.scheduled',
            'subject_line' => $audit->period_label
                ? '[Internal Audit] '.mb_strtoupper($audit->period_label)
                : "[Internal Audit] Jadwal Audit {$audit->code}",
            'recipients'   => $sent,
            'cc'           => $failed,
            'status'       => empty($failed) ? 'sent' : (empty($sent) ? 'failed' : 'partial'),
            'error'        => $failed ? ('Gagal kirim: '.implode(', ', $failed)) : null,
            'results'      => $results,
        ]);

        if (!empty($sent)) {
            $audit->forceFill(['notified_at' => now()])->save();
        }

        return $results;
    }

    private function nextCode(): string
    {
        return self::nextAuditCode();
    }

    public static function nextAuditCode(): string
    {
        return self::nextSequentialCode(Audit::withTrashed(), 'IA');
    }

    private function nextScheduleGroup(): string
    {
        return self::nextSequentialCode(\App\Models\AuditSchedule::withTrashed(), 'SA');
    }

    /**
     * Nomor urut berikutnya untuk tahun berjalan, mis. IA-2026-034.
     *
     * Diambil dari nomor TERTINGGI yang pernah dipakai — termasuk baris yang sudah
     * dihapus — karena unique index pada kolom `code` tetap memblokir kode milik
     * baris ter-soft-delete. Pola lama (menghitung jumlah baris) membuat nomor
     * mundur setiap ada penghapusan lalu menabrak kode lama: duplicate key 1062.
     */
    private static function nextSequentialCode(Builder $query, string $prefix): string
    {
        $year   = now()->format('Y');
        $needle = "{$prefix}-{$year}-";

        $max = $query->where('code', 'like', $needle.'%')
            ->pluck('code')
            ->map(fn ($code) => (int) substr($code, strlen($needle)))
            ->max() ?? 0;

        return sprintf('%s-%s-%03d', $prefix, $year, $max + 1);
    }

    /**
     * Ulangi $callback bila insert ditolak unique index (SQLSTATE 23000) — terjadi
     * saat dua jadwal dibuat bersamaan dan memperebutkan nomor urut yang sama.
     */
    private function retryOnDuplicateCode(callable $callback, int $attempts = 3)
    {
        for ($attempt = 1; ; $attempt++) {
            try {
                return $callback();
            } catch (QueryException $e) {
                if ($attempt >= $attempts || (string) $e->getCode() !== '23000') {
                    throw $e;
                }
            }
        }
    }
}
