<?php

namespace App\Http\Controllers;

use App\Models\Audit;
use App\Models\AuditFinding;
use App\Models\CorrectiveAction;
use App\Models\Department;
use App\Models\Document;
use App\Models\Risk;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /** Ambang "segera jatuh tempo" untuk review dokumen (hari). */
    private const REVIEW_HORIZON_DAYS = 30;

    /** Target skor kepatuhan organisasi (%) — dipakai sebagai pembanding, bukan sebagai data. */
    private const COMPLIANCE_TARGET = 92.0;

    /** Status tindakan korektif yang dianggap sudah selesai/tidak berjalan lagi. */
    private const CAPA_TERMINAL = ['closed_effective', 'closed_ineffective', 'rejected'];

    /**
     * Departemen yang membatasi seluruh angka dashboard, atau null bila user
     * berhak melihat data lintas departemen (Administrator, Document Control,
     * dan siapa pun yang menjadi Lead Auditor di salah satu audit).
     */
    private ?int $scopeDept = null;

    /** Hasil sparklines() — dihitung sekali per request, dipakai empat kartu KPI. */
    private ?array $sparkCache = null;

    public function __invoke(): Response
    {
        $user = auth()->user();

        $seeAll = $user->hasAnyRole(['super_admin', 'document_control'])
            || Audit::where('lead_auditor_id', $user->id)
                ->orWhere('actual_lead_auditor_id', $user->id)
                ->exists();

        // 0 = tidak cocok dengan department_id mana pun, sehingga user tanpa
        // departemen tidak diam-diam melihat data seluruh organisasi.
        $this->scopeDept = $seeAll ? null : ($user->department_id ?: 0);

        $now = Carbon::now();

        return Inertia::render('dashboard', [
            'kpi'             => $this->kpi($user),
            // Blok audit internal — bagian utama dashboard, sesuai bobot datanya.
            'findingFunnel'   => $this->findingFunnel(),
            'findingTrend'    => $this->findingTrend(),
            'findingsByDept'  => $this->findingsByDepartment(),
            'overdueFindings' => $this->overdueFindings(),
            'upcomingAudits'  => $this->upcomingAudits(),
            'auditStatus'     => $this->auditStatus(),
            // Blok pendukung.
            'approvalStats'   => $this->approvalStats($now),
            'heatmap'         => $this->riskHeatmap(),
            'departmentPerf'  => $this->departmentPerformance(),
            'recentActivity'  => $this->recentActivity(),
            // Dipakai UI untuk menyatakan angka yang tampil terbatas pada satu departemen.
            'scope' => [
                'department'   => $this->scopeDept === null
                    ? null
                    : (Department::find($this->scopeDept)?->name ?? 'Tanpa Departemen'),
                'generated_at' => $now->locale('id')->translatedFormat('d F Y · H:i'),
            ],
        ]);
    }

    // ───────────────────────────── KPI utama ─────────────────────────────

    private function kpi(User $user): array
    {
        $compliance = $this->complianceScore();
        $findings   = $this->findingCounts();

        $ncrOpen = $this->scoped(CorrectiveAction::whereNotIn('status', self::CAPA_TERMINAL))->count();
        $ncrOverdue = $this->scoped(
            CorrectiveAction::whereNotIn('status', self::CAPA_TERMINAL)
                ->whereDate('due_date', '<', today())
        )->count();

        $docsPending = $this->scoped(Document::where('status', Document::STATUS_IN_REVIEW))->count();
        $docsReviewDue = $this->scoped(
            Document::whereNotNull('next_review_date')
                ->whereDate('next_review_date', '<=', today()->addDays(self::REVIEW_HORIZON_DAYS))
                ->whereIn('status', [Document::STATUS_PUBLISHED, Document::STATUS_APPROVED])
        )->count();

        return [
            // Skor kepatuhan berikut pembilang/penyebutnya, supaya angka persen
            // tidak pernah tampil tanpa konteks jumlah item yang mendasarinya.
            'compliance_score'   => $compliance['score'],
            'compliance_closed'  => $compliance['closed'],
            'compliance_total'   => $compliance['total'],
            'compliance_target'  => self::COMPLIANCE_TARGET,

            'findings_open'      => $findings['open'],
            'findings_overdue'   => $findings['overdue'],
            'findings_waiting'   => $findings['waiting'],
            'findings_total'     => $findings['total'],

            'ncr_open'           => $ncrOpen,
            'ncr_overdue'        => $ncrOverdue,

            'documents_pending'  => $docsPending,
            'documents_review_due' => $docsReviewDue,
            'documents_pending_age' => $this->averagePendingReviewDays(),

            'risks_critical'     => $this->scoped(Risk::where('level', 'critical'))->count(),
            'audits_in_progress' => $this->scoped(Audit::whereIn('status', ['scheduled', 'in_progress', 'reporting']))->count(),

            // Antrian pribadi — satu-satunya angka dashboard yang spesifik per user.
            'my_approvals'       => DB::table('approvals')
                ->where('approver_id', $user->id)
                ->where('status', 'pending')
                ->count(),

            // Deret 12 bulan (bulan berjalan di posisi terakhir). Nilainya apa
            // adanya: deret yang datar berarti memang tidak ada perubahan.
            'spark_compliance' => $this->sparklines()['compliance'],
            'spark_findings'   => $this->sparklines()['findings'],
            'spark_ncr'        => $this->sparklines()['ncr'],
            'spark_documents'  => $this->sparklines()['documents'],
        ];
    }

    /**
     * Skor kepatuhan = proporsi ketidaksesuaian yang sudah ditutup, dihitung
     * dari SELURUH ketidaksesuaian yang tercatat: temuan audit internal dan
     * tindakan korektif (NCR/CAR/CAPA). Sebelumnya hanya tindakan korektif
     * yang dihitung, sehingga ratusan temuan audit sama sekali tidak
     * memengaruhi angka utama dashboard.
     *
     * @return array{score:float,closed:int,total:int}
     */
    private function complianceScore(): array
    {
        $findingsTotal  = $this->scopedFindings(AuditFinding::query())->count();
        $findingsClosed = $this->scopedFindings(AuditFinding::where('status', AuditFinding::STATUS_CLOSED))->count();

        $capaTotal  = $this->scoped(CorrectiveAction::query())->count();
        $capaClosed = $this->scoped(CorrectiveAction::where('status', 'closed_effective'))->count();

        $total  = $findingsTotal + $capaTotal;
        $closed = $findingsClosed + $capaClosed;

        return [
            'score'  => $total === 0 ? 100.0 : round(($closed / $total) * 100, 1),
            'closed' => $closed,
            'total'  => $total,
        ];
    }

    /** @return array{open:int,overdue:int,waiting:int,total:int} */
    private function findingCounts(): array
    {
        $waitingStatuses = [
            AuditFinding::STATUS_WAITING_APPROVAL,
            AuditFinding::STATUS_WAITING_AUDITOR_VERIFICATION,
            AuditFinding::STATUS_WAITING_VERIFICATION,
        ];

        return [
            'total'   => $this->scopedFindings(AuditFinding::query())->count(),
            'open'    => $this->scopedFindings(
                AuditFinding::whereNotIn('status', [AuditFinding::STATUS_CLOSED, AuditFinding::STATUS_REJECTED])
            )->count(),
            'overdue' => $this->scopedFindings(AuditFinding::overdue())->count(),
            'waiting' => $this->scopedFindings(AuditFinding::whereIn('status', $waitingStatuses))->count(),
        ];
    }

    /** Rata-rata umur (hari) dokumen yang masih menunggu review. */
    private function averagePendingReviewDays(): ?float
    {
        $avg = $this->scoped(Document::where('status', Document::STATUS_IN_REVIEW))
            ->avg(DB::raw('DATEDIFF(NOW(), updated_at)'));

        return $avg === null ? null : round((float) $avg, 1);
    }

    // ───────────────────────────── Grafik ─────────────────────────────

    /**
     * Sebaran temuan audit menurut tahap alur kerjanya — menggantikan grafik
     * "audit per standar" yang praktis kosong karena seluruh audit memakai
     * standar yang sama.
     */
    private function findingFunnel(): array
    {
        $byStatus = $this->scopedFindings(AuditFinding::query())
            ->select('status', DB::raw('COUNT(*) as c'))
            ->groupBy('status')
            ->pluck('c', 'status');

        $stages = [
            ['key' => AuditFinding::STATUS_OPEN,                         'label' => 'Open'],
            ['key' => AuditFinding::STATUS_IN_PROGRESS,                  'label' => 'Revisi'],
            ['key' => AuditFinding::STATUS_WAITING_APPROVAL,             'label' => 'Approval Atasan'],
            ['key' => AuditFinding::STATUS_WAITING_AUDITOR_VERIFICATION, 'label' => 'Verifikasi Auditor'],
            ['key' => AuditFinding::STATUS_WAITING_VERIFICATION,         'label' => 'Verifikasi Lead'],
            ['key' => AuditFinding::STATUS_CLOSED,                       'label' => 'Closed'],
        ];

        $byCategory = $this->scopedFindings(AuditFinding::query())
            ->select('category', DB::raw('COUNT(*) as c'))
            ->groupBy('category')
            ->pluck('c', 'category');

        return [
            'stages' => collect($stages)->map(fn ($s) => [
                'label' => $s['label'],
                'count' => (int) ($byStatus[$s['key']] ?? 0),
            ])->all(),
            'categories' => [
                ['label' => 'PFI',   'count' => (int) ($byCategory[AuditFinding::CAT_PFI] ?? 0)],
                ['label' => 'Minor', 'count' => (int) ($byCategory[AuditFinding::CAT_MINOR] ?? 0)],
                ['label' => 'Major', 'count' => (int) ($byCategory[AuditFinding::CAT_MAJOR] ?? 0)],
            ],
        ];
    }

    /** Temuan audit dibuat vs ditutup per bulan, 12 bulan terakhir. */
    private function findingTrend(): array
    {
        $start = now()->subMonths(11)->startOfMonth();

        $opened = $this->scopedFindings(AuditFinding::query())
            ->where('audit_findings.created_at', '>=', $start)
            ->select(DB::raw("DATE_FORMAT(audit_findings.created_at, '%Y-%m') as ym"), DB::raw('COUNT(*) as c'))
            ->groupBy('ym')->pluck('c', 'ym');

        $closed = $this->scopedFindings(AuditFinding::query())
            ->whereNotNull('closed_at')
            ->where('closed_at', '>=', $start)
            ->select(DB::raw("DATE_FORMAT(closed_at, '%Y-%m') as ym"), DB::raw('COUNT(*) as c'))
            ->groupBy('ym')->pluck('c', 'ym');

        $months = [];
        for ($i = 11; $i >= 0; $i--) {
            $m = now()->subMonths($i);
            $key = $m->format('Y-m');
            $months[] = [
                'month'  => $m->locale('id')->translatedFormat('M'),
                'opened' => (int) ($opened[$key] ?? 0),
                'closed' => (int) ($closed[$key] ?? 0),
            ];
        }

        return $months;
    }

    /**
     * Temuan per departemen yang diaudit, dipisah menurut kategori — memberi
     * gambaran di mana ketidaksesuaian menumpuk.
     *
     * Seluruh departemen dikirim apa adanya, terurut dari temuan terbanyak.
     * Penggabungan ekor daftar menjadi "n departemen lainnya" dilakukan di sisi
     * tampilan supaya user bisa memecahnya kembali tanpa request baru.
     */
    private function findingsByDepartment(): array
    {
        $rows = $this->scopedFindings(AuditFinding::query())
            ->join('audits', 'audits.id', '=', 'audit_findings.audit_id')
            ->leftJoin('departments', 'departments.id', '=', 'audits.department_id')
            ->selectRaw('audits.department_id as department_id')
            ->selectRaw("COALESCE(departments.name, 'Tanpa Departemen') as dept")
            ->selectRaw("SUM(CASE WHEN audit_findings.category = ? THEN 1 ELSE 0 END) as pfi", [AuditFinding::CAT_PFI])
            ->selectRaw("SUM(CASE WHEN audit_findings.category = ? THEN 1 ELSE 0 END) as minor", [AuditFinding::CAT_MINOR])
            ->selectRaw("SUM(CASE WHEN audit_findings.category = ? THEN 1 ELSE 0 END) as major", [AuditFinding::CAT_MAJOR])
            ->groupBy('audits.department_id', 'dept')
            ->get()
            ->map(fn ($r) => [
                // id dipakai UI untuk menautkan slice donut ke /audits?department=…
                'id'    => $r->department_id ? (int) $r->department_id : null,
                'name'  => $r->dept,
                'pfi'   => (int) $r->pfi,
                'minor' => (int) $r->minor,
                'major' => (int) $r->major,
                'total' => (int) $r->pfi + (int) $r->minor + (int) $r->major,
            ])
            ->sortByDesc('total')
            ->values()
            ->all();

        return $rows;
    }

    /**
     * Temuan paling lama lewat jatuh tempo — daftar kerja, bukan sekadar angka.
     * Diurutkan dari yang paling terlambat agar yang paling mendesak di atas.
     */
    private function overdueFindings()
    {
        return $this->scopedFindings(AuditFinding::overdue())
            ->with(['audit:id,code,department_id', 'audit.department:id,name', 'owner:id,name'])
            ->orderBy('due_date')
            ->limit(6)
            ->get()
            ->map(fn (AuditFinding $f) => [
                'id'           => $f->id,
                'audit_id'     => $f->audit_id,
                'reference'    => $f->reference ?? "F-{$f->id}",
                'category'     => $f->category,
                'description'  => \Illuminate\Support\Str::limit($f->description, 90),
                'owner'        => $f->owner?->name,
                'department'   => $f->audit?->department?->name,
                'due_date'     => $f->due_date?->format('d M Y'),
                'days_overdue' => $f->due_date ? $f->due_date->diffInDays(today()) : 0,
            ]);
    }

    /** Sebaran status jadwal audit. */
    private function auditStatus(): array
    {
        $counts = $this->scoped(Audit::query())
            ->select('status', DB::raw('COUNT(*) as c'))
            ->groupBy('status')
            ->pluck('c', 'status');

        $labels = [
            'planned'     => 'Planned',
            'scheduled'   => 'Scheduled',
            'in_progress' => 'In Progress',
            'reporting'   => 'Reporting',
            'closed'      => 'Closed',
        ];

        return collect($labels)
            // key ikut dikirim supaya slice donut bisa menuju /audits?status=…
            ->map(fn ($label, $key) => ['key' => $key, 'label' => $label, 'count' => (int) ($counts[$key] ?? 0)])
            ->values()
            ->all();
    }

    private function approvalStats(Carbon $now): array
    {
        // Tabel approvals bersifat polimorfik dan tidak punya department_id sendiri,
        // jadi pembatasannya lewat departemen approver.
        $approvals = fn () => DB::table('approvals')
            ->when($this->scopeDept !== null, fn ($q) => $q->whereIn(
                'approver_id',
                User::where('department_id', $this->scopeDept)->pluck('id')
            ));

        $quarter = [$now->copy()->startOfQuarter(), $now];

        return [
            'approved' => $approvals()->where('status', 'approved')->whereBetween('created_at', $quarter)->count(),
            'pending'  => $approvals()->where('status', 'pending')->count(),
            'rejected' => $approvals()->where('status', 'rejected')->whereBetween('created_at', $quarter)->count(),
            'revision' => $approvals()->where('status', 'revision')->whereBetween('created_at', $quarter)->count(),
        ];
    }

    /** Matriks risiko [severity 1..5][likelihood 1..5] → jumlah. */
    private function riskHeatmap(): array
    {
        $heatmap = collect(range(1, 5))->mapWithKeys(fn ($s) => [$s => array_fill(1, 5, 0)])->toArray();

        $this->scoped(Risk::query())
            ->select('severity', 'likelihood', DB::raw('COUNT(*) as count'))
            ->groupBy('severity', 'likelihood')
            ->get()
            ->each(function ($row) use (&$heatmap) {
                $heatmap[$row->severity][$row->likelihood] = (int) $row->count;
            });

        return $heatmap;
    }

    /** Departemen dengan capaian KPI — hanya yang benar-benar punya catatan KPI. */
    private function departmentPerformance()
    {
        return Department::query()
            ->with('kpis.records')
            ->where('is_active', true)
            ->when($this->scopeDept !== null, fn ($q) => $q->where('id', $this->scopeDept))
            ->get()
            ->map(function (Department $d) {
                $records = $d->kpis->flatMap->records;
                return [
                    'name'    => $d->name,
                    'score'   => round($records->avg('achievement_pct') ?? 0, 1),
                    'records' => $records->count(),
                ];
            })
            ->filter(fn ($d) => $d['records'] > 0)
            ->sortByDesc('score')
            ->values();
    }

    /** Audit terjadwal dalam 30 hari ke depan. */
    private function upcomingAudits()
    {
        return $this->scoped(Audit::query())
            ->with(['department:id,name', 'leadAuditor:id,name', 'actualLeadAuditor:id,name'])
            ->whereNotIn('status', ['closed', 'cancelled'])
            ->whereDate('planned_date', '>=', today())
            ->whereDate('planned_date', '<=', today()->addDays(self::REVIEW_HORIZON_DAYS))
            ->orderBy('planned_date')
            ->limit(5)
            ->get()
            ->map(fn (Audit $a) => [
                'id'           => $a->id,
                'code'         => $a->code,
                'title'        => $a->title,
                'department'   => $a->department?->name,
                'lead_auditor' => ($a->actualLeadAuditor ?: $a->leadAuditor)?->name,
                'planned_date' => $a->planned_date?->format('d M Y'),
                'days_away'    => $a->planned_date ? today()->diffInDays($a->planned_date, false) : null,
            ]);
    }

    private function recentActivity()
    {
        return \Spatie\Activitylog\Models\Activity::query()
            ->with('causer')
            // Aktivitas dibatasi ke pelaku dari departemen yang sama.
            ->when($this->scopeDept !== null, fn ($q) => $q->whereIn(
                'causer_id',
                User::where('department_id', $this->scopeDept)->pluck('id')
            )->where('causer_type', User::class))
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn ($a) => [
                'id'       => $a->id,
                'event'    => $a->event,
                'log_name' => $a->log_name,
                'subject'  => class_basename($a->subject_type),
                'causer'   => $a->causer?->name ?? 'System',
                'time_ago' => $a->created_at?->diffForHumans(),
            ]);
    }

    // ───────────────────────────── Sparkline ─────────────────────────────

    /**
     * Deret 12 bulan untuk kartu KPI, dihitung dari data sebenarnya.
     *
     * Versi sebelumnya mengarang kurva (easeOutCubic + gelombang sinus) ketika
     * data terlalu datar; pada dashboard kepatuhan hal itu menampilkan tren
     * yang tidak pernah terjadi. Deret datar sekarang dibiarkan datar.
     *
     * @return array{compliance:array<int,float|null>,findings:int[],ncr:int[],documents:int[]}
     */
    private function sparklines(): array
    {
        // Di-cache per instance controller (bukan static) supaya tidak ada
        // kebocoran antar-request bila suatu saat berjalan di worker jangka panjang.
        if ($this->sparkCache !== null) {
            return $this->sparkCache;
        }

        // Enam agregasi GROUP BY, bukan 12 iterasi × 6 COUNT. Versi loop
        // menghasilkan 72 query hanya untuk empat sparkline — beban yang tidak
        // sepadan di shared hosting. Angka kumulatif per bulan dihitung di PHP.
        $months = collect(range(11, 0))->map(fn ($i) => now()->subMonths($i)->format('Y-m'))->all();

        $fOpened = $this->cumulative(
            $this->monthly($this->scopedFindings(AuditFinding::query()), 'audit_findings.created_at'),
            $months,
        );
        $fClosed = $this->cumulative(
            $this->monthly(
                $this->scopedFindings(AuditFinding::where('status', AuditFinding::STATUS_CLOSED))->whereNotNull('closed_at'),
                'closed_at',
            ),
            $months,
        );

        $cOpened = $this->cumulative($this->monthly($this->scoped(CorrectiveAction::query()), 'created_at'), $months);
        $cClosedEff = $this->cumulative(
            $this->monthly($this->scoped(CorrectiveAction::where('status', 'closed_effective'))->whereNotNull('closed_at'), 'closed_at'),
            $months,
        );
        $cClosedAny = $this->cumulative(
            $this->monthly($this->scoped(CorrectiveAction::whereIn('status', self::CAPA_TERMINAL))->whereNotNull('closed_at'), 'closed_at'),
            $months,
        );
        $docs = $this->cumulative(
            $this->monthly($this->scoped(Document::where('status', Document::STATUS_IN_REVIEW)), 'updated_at'),
            $months,
        );

        $compliance = $findings = $ncr = $documents = [];

        foreach (array_keys($months) as $i) {
            // Bulan sebelum ada ketidaksesuaian sama sekali dibiarkan null —
            // menuliskannya 100% akan memunculkan "tebing" penurunan palsu
            // pada grafik begitu data pertama masuk.
            $total = $fOpened[$i] + $cOpened[$i];
            $compliance[] = $total === 0
                ? null
                : round((($fClosed[$i] + $cClosedEff[$i]) / $total) * 100, 1);
            $findings[]   = max(0, $fOpened[$i] - $fClosed[$i]);
            $ncr[]        = max(0, $cOpened[$i] - $cClosedAny[$i]);
            $documents[]  = $docs[$i];
        }

        return $this->sparkCache = compact('compliance', 'findings', 'ncr', 'documents');
    }

    /**
     * Jumlah baris per bulan untuk satu kolom tanggal, tanpa batas bawah —
     * riwayat penuh dibutuhkan agar deret kumulatifnya tidak kehilangan
     * data yang lebih tua dari 12 bulan.
     *
     * @return array<string,int> ['YYYY-MM' => jumlah]
     */
    private function monthly($query, string $column): array
    {
        return $query
            ->selectRaw("DATE_FORMAT({$column}, '%Y-%m') as ym, COUNT(*) as c")
            ->groupBy('ym')
            ->pluck('c', 'ym')
            ->map(fn ($c) => (int) $c)
            ->all();
    }

    /**
     * Ubah jumlah per bulan menjadi deret kumulatif hingga akhir tiap bulan
     * pada $months, termasuk seluruh data sebelum bulan pertama.
     *
     * @param  array<string,int>  $monthly
     * @param  string[]           $months
     * @return int[]
     */
    private function cumulative(array $monthly, array $months): array
    {
        $running = 0;
        foreach ($monthly as $ym => $count) {
            if ($ym < $months[0]) {
                $running += $count;
            }
        }

        $series = [];
        foreach ($months as $ym) {
            $running += $monthly[$ym] ?? 0;
            $series[] = $running;
        }

        return $series;
    }

    // ───────────────────────────── Pembatasan akses ─────────────────────────────

    /** Batasi query ke departemen user, kecuali ia berhak melihat lintas departemen. */
    private function scoped($query)
    {
        return $this->scopeDept === null ? $query : $query->where('department_id', $this->scopeDept);
    }

    /**
     * Temuan audit tidak punya kolom department_id — kepemilikannya menurun
     * dari audit induknya, jadi pembatasannya lewat relasi.
     */
    private function scopedFindings(Builder $query): Builder
    {
        return $this->scopeDept === null
            ? $query
            : $query->whereHas('audit', fn ($q) => $q->where('department_id', $this->scopeDept));
    }
}
