<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\Audit;
use App\Models\AuditFinding;
use App\Models\CorrectiveAction;
use App\Models\Department;
use App\Models\Document;
use App\Models\Kpi;
use App\Models\KpiRecord;
use App\Models\Risk;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $departments = collect([
            ['code' => 'QMS', 'name' => 'Quality Management'],
            ['code' => 'PRD', 'name' => 'Production'],
            ['code' => 'MTC', 'name' => 'Maintenance'],
            ['code' => 'WH',  'name' => 'Warehouse'],
            ['code' => 'HRD', 'name' => 'HR & Development'],
            ['code' => 'PUR', 'name' => 'Purchasing'],
            ['code' => 'ENG', 'name' => 'Engineering'],
        ])->map(fn ($d) => Department::create($d + ['is_active' => true]));

        $roleNames = ['super_admin', 'qmr', 'director', 'manager', 'supervisor', 'staff', 'auditor'];
        $users = collect();

        // Super admin
        $admin = User::create([
            'name' => 'IT Admin', 'email' => 'admin@iso-dms.test',
            'password' => Hash::make('password'),
            'department_id' => $departments->first()->id,
            'employee_no' => 'EMP-001', 'position' => 'IT Administrator', 'status' => 'active',
            'email_verified_at' => now(),
        ]);
        $admin->assignRole('super_admin');
        $users->push($admin);

        // One person per role
        foreach (['qmr' => 'QMR', 'director' => 'Director', 'manager' => 'Manager',
                  'supervisor' => 'Supervisor', 'staff' => 'Staff', 'auditor' => 'Auditor'] as $role => $label) {
            $u = User::create([
                'name' => $label.' User', 'email' => "{$role}@iso-dms.test",
                'password' => Hash::make('password'),
                'department_id' => $departments->random()->id,
                'employee_no' => 'EMP-'.strtoupper(substr($role, 0, 3)),
                'position' => $label, 'status' => 'active',
                'email_verified_at' => now(),
            ]);
            $u->assignRole($role);
            $users->push($u);
        }

        // Documents
        $documentSamples = [
            ['SOP-PRD-014', 'Injection Molding Parameter Setup', 'sop', 'iatf', 1, 'published'],
            ['SOP-QC-007',  'Final Inspection — Visual Check',   'sop', 'iso_9001', 0, 'in_review'],
            ['DOC-HRD-007', 'Training Procedure 2026 Edition',   'manual', 'iso_9001', 4, 'in_review'],
            ['WI-MTC-022',  'Preventive Maintenance Checklist',  'work_instruction', 'iso_45001', 2, 'published'],
            ['POL-ENV-001', 'Environmental Policy 2026',         'policy', 'iso_14001', 0, 'published'],
        ];
        foreach ($documentSamples as [$code, $title, $type, $std, $deptIdx, $status]) {
            Document::create([
                'code' => $code, 'title' => $title, 'type' => $type, 'standard' => $std,
                'department_id' => $departments[$deptIdx]->id,
                'owner_id' => $users->random()->id,
                'status' => $status,
                'current_revision' => '1.0',
                'effective_date' => Carbon::now()->subMonths(rand(1, 12))->toDateString(),
                'next_review_date' => Carbon::now()->addMonths(12)->toDateString(),
                'description' => 'Auto-seeded demo document.',
            ]);
        }

        // NCR / CAPA
        $ncrSamples = [
            ['NCR-2026-018', 'Coating thickness deviation – Line 2', 'ncr',  'critical', 'open'],
            ['CAR-2026-012', 'Supplier delivery delay analysis',     'car',  'high',     'in_progress'],
            ['CAPA-2026-005','Calibration overdue – Caliper-001',    'capa', 'critical', 'verification'],
            ['NCR-2026-009', 'Document numbering inconsistency',     'ncr',  'low',      'closed_effective'],
            ['CAPA-2026-002','Training record gap – Production',     'capa', 'medium',   'closed_effective'],
        ];
        foreach ($ncrSamples as [$code, $title, $kind, $sev, $status]) {
            CorrectiveAction::create([
                'code' => $code, 'kind' => $kind, 'source' => 'internal_audit',
                'department_id' => $departments->random()->id,
                'owner_id' => $users->random()->id,
                'raised_by_id' => $users->random()->id,
                'title' => $title,
                'problem_statement' => $title,
                'severity' => $sev,
                'status' => $status,
                'due_date' => Carbon::now()->addDays(rand(1, 14))->toDateString(),
                'closed_at' => str_starts_with($status, 'closed') ? now()->subDays(rand(1, 30)) : null,
            ]);
        }

        // Risks — spread severity × likelihood
        $riskTitles = ['Power outage', 'Critical machine breakdown', 'Worker injury', 'Supplier monopoly',
                       'Cyber attack', 'Regulatory change', 'Customer complaint spike', 'Raw material shortage',
                       'Forklift accident', 'Data privacy breach', 'Emission limit exceedance', 'Audit finding spike'];
        foreach ($riskTitles as $idx => $title) {
            $s = rand(1, 5); $l = rand(1, 5);
            Risk::create([
                'code' => sprintf('RISK-2026-%03d', $idx + 1),
                'title' => $title,
                'department_id' => $departments->random()->id,
                'owner_id' => $users->random()->id,
                'category' => collect(['operational','safety','environment','quality','compliance'])->random(),
                'severity' => $s, 'likelihood' => $l, 'score' => $s * $l,
                'level' => Risk::levelFromScore($s * $l),
                'context' => 'Identified from quarterly risk review.',
                'status' => 'assessed',
            ]);
        }

        // KPIs with records
        foreach ($departments as $dept) {
            $kpi = Kpi::create([
                'code' => 'KPI-'.$dept->code,
                'name' => $dept->name.' Compliance Rate',
                'department_id' => $dept->id,
                'owner_id' => $users->random()->id,
                'frequency' => 'monthly',
                'direction' => 'higher_is_better',
                'target' => 95,
                'unit' => '%',
                'is_active' => true,
            ]);
            for ($m = 0; $m < 6; $m++) {
                $actual = rand(70, 100);
                KpiRecord::create([
                    'kpi_id' => $kpi->id,
                    'period' => now()->subMonths($m)->startOfMonth()->toDateString(),
                    'actual' => $actual,
                    'target_snapshot' => 95,
                    'achievement_pct' => round(($actual / 95) * 100, 2),
                    'status' => KpiRecord::statusFromAchievement(($actual / 95) * 100),
                    'recorded_by' => $admin->id,
                ]);
            }
        }

        // Suppliers
        foreach (['Sentosa Manufaktur','Berkah Logistik','Prima Komponen','Andalan Kimia'] as $i => $name) {
            $score = rand(55, 98);
            Supplier::create([
                'code' => 'SUP-'.($i + 1),
                'name' => 'PT '.$name,
                'contact_person' => 'PIC '.$name,
                'email' => 'contact'.($i + 1).'@example.test',
                'phone' => '021-555-'.(1000 + $i),
                'latest_score' => $score,
                'status' => $score >= 80 ? 'approved' : ($score >= 60 ? 'conditional' : 'rejected'),
                'approved_until' => now()->addMonths(6)->toDateString(),
            ]);
        }

        // Internal Audit demos
        $auditeePool = $users->where('id', '!=', $admin->id);
        $auditSamples = [
            ['Audit Internal Q2 — Produksi', 'iso_9001', $departments[1], 'Plant 1 — Line A', 'in_progress'],
            ['Audit Internal Q2 — Warehouse', 'iso_9001', $departments[3], 'Gudang Pusat', 'scheduled'],
            ['Surveillance Audit ISO 14001 — QC', 'iso_14001', $departments[0], 'QC Lab',     'closed'],
            ['Audit Internal HR — Training Records', 'iso_9001', $departments[4], 'HR Office', 'reporting'],
        ];
        foreach ($auditSamples as $idx => [$title, $std, $dept, $loc, $status]) {
            $audit = Audit::create([
                'code'             => sprintf('IA-2026-%03d', $idx + 1),
                'title'            => $title,
                'standard'         => $std,
                'type'             => 'internal',
                'department_id'    => $dept->id,
                'location'         => $loc,
                'lead_auditor_id'  => $users->firstWhere('email', 'auditor@iso-dms.test')?->id ?? $admin->id,
                'team'             => $users->where('id', '!=', $admin->id)->random(min(2, $users->count() - 1))->pluck('id')->all(),
                'auditees'         => $auditeePool->random(min(2, $auditeePool->count()))->pluck('id')->all(),
                'planned_date'     => now()->addDays(($idx - 1) * 5)->toDateString(),
                'status'           => $status,
                'scope'            => 'Klausul 7.1, 8.5, 9.1',
                'objectives'       => 'Memastikan kesesuaian proses dengan SOP & standar.',
                'notified_at'      => now()->subDays(7),
            ]);

            // Some findings per audit
            $findingSpecs = [
                ['major_nc',    '7.1.5', 'SOP pengecekan kalibrasi tidak dijalankan 3 shift terakhir.', 'waiting_approval', 10],
                ['minor_nc',    '8.5.1', 'Form serah terima belum lengkap tanda tangan supervisor.',    'in_progress', 7],
                ['minor_nc',    '7.5.3', 'Dokumen WI versi lama masih dipakai di lapangan.',            'waiting_verification', 5],
                ['opportunity', null,    'Label rak material kurang jelas — disarankan font lebih besar.','closed', null],
            ];
            foreach ($findingSpecs as $fi => [$cat, $clause, $desc, $st, $dueOffset]) {
                $owner = User::find($audit->auditees[0] ?? $admin->id);
                AuditFinding::create([
                    'audit_id'          => $audit->id,
                    'reference'         => sprintf('%s/F-%03d', $audit->code, $fi + 1),
                    'category'          => $cat,
                    'clause'            => $clause,
                    'description'       => $desc,
                    'finding_owner_id'  => $owner->id,
                    'approver_id'       => $owner->department?->manager_id,
                    'verifier_id'       => $audit->lead_auditor_id,
                    'status'            => $st,
                    'due_date'          => $dueOffset ? now()->addDays($dueOffset)->toDateString() : null,
                    'root_cause'        => in_array($st, ['waiting_approval','waiting_verification','closed']) ? 'Operator belum di-training SOP terbaru.' : null,
                    'corrective_action' => in_array($st, ['waiting_approval','waiting_verification','closed']) ? 'Refresh training, pasang poster, briefing harian.' : null,
                    'submitted_at'      => in_array($st, ['waiting_approval','waiting_verification','closed']) ? now()->subDays(2) : null,
                    'approved_at'       => in_array($st, ['waiting_verification','closed']) ? now()->subDay() : null,
                    'verified_at'       => $st === 'closed' ? now() : null,
                    'closed_at'         => $st === 'closed' ? now() : null,
                ]);
            }
        }

        // Assets / calibration
        foreach (['Vernier Caliper','Torque Wrench','Pressure Gauge','Multi-meter'] as $i => $name) {
            Asset::create([
                'code' => 'AST-'.sprintf('%03d', $i + 1),
                'name' => $name,
                'serial_no' => 'SN-'.rand(10000, 99999),
                'department_id' => $departments->random()->id,
                'calibration_interval_months' => 12,
                'last_calibration_date' => now()->subMonths(rand(1, 11))->toDateString(),
                'next_calibration_date' => now()->addMonths(rand(-2, 11))->toDateString(),
                'status' => 'active',
            ]);
        }
    }
}
