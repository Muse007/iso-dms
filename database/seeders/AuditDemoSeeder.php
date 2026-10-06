<?php

namespace Database\Seeders;

use App\Models\Audit;
use App\Models\AuditFinding;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Seeder;

class AuditDemoSeeder extends Seeder
{
    public function run(): void
    {
        $admin    = User::where('email', 'admin@iso-dms.test')->first();
        $auditor  = User::where('email', 'auditor@iso-dms.test')->first() ?? $admin;
        $auditees = User::whereNotIn('email', ['admin@iso-dms.test', 'auditor@iso-dms.test'])->limit(4)->get();
        $depts    = Department::limit(5)->get();
        if (!$admin || $depts->isEmpty() || $auditees->isEmpty()) {
            $this->command?->warn('Skipped: need users + departments first (run DemoDataSeeder).');
            return;
        }

        $samples = [
            ['Audit Internal Q2 — Produksi',       'iso_9001',  'Plant 1 — Line A', 'in_progress'],
            ['Audit Internal Q2 — Warehouse',      'iso_9001',  'Gudang Pusat',     'scheduled'],
            ['Surveillance ISO 14001 — QC',        'iso_14001', 'QC Lab',           'closed'],
            ['Audit HR — Training Records',        'iso_9001',  'HR Office',        'reporting'],
        ];

        foreach ($samples as $idx => [$title, $std, $loc, $status]) {
            $dept = $depts[$idx % $depts->count()];
            $code = sprintf('IA-%s-%03d', now()->format('Y'), Audit::whereYear('created_at', now()->year)->count() + 1);
            $audit = Audit::create([
                'code'             => $code,
                'title'            => $title,
                'standard'         => $std,
                'type'             => 'internal',
                'department_id'    => $dept->id,
                'location'         => $loc,
                'lead_auditor_id'  => $auditor->id,
                'team'             => $auditees->random(min(2, $auditees->count()))->pluck('id')->all(),
                'auditees'         => $auditees->random(min(2, $auditees->count()))->pluck('id')->all(),
                'planned_date'     => now()->addDays(($idx - 1) * 5)->toDateString(),
                'status'           => $status,
                'scope'            => 'Klausul 7.1, 8.5, 9.1',
                'objectives'       => 'Memastikan kesesuaian proses dengan SOP & standar.',
                'notified_at'      => now()->subDays(7),
            ]);

            $findingSpecs = [
                ['major_nc',    '7.1.5', 'SOP pengecekan kalibrasi tidak dijalankan 3 shift terakhir.', 'waiting_approval', 10],
                ['minor_nc',    '8.5.1', 'Form serah terima belum lengkap tanda tangan supervisor.',    'in_progress', 7],
                ['minor_nc',    '7.5.3', 'Dokumen WI versi lama masih dipakai di lapangan.',            'waiting_verification', 5],
                ['opportunity', null,    'Label rak material kurang jelas — disarankan font lebih besar.','closed', null],
            ];
            foreach ($findingSpecs as $fi => [$cat, $clause, $desc, $st, $dueOffset]) {
                $owner = $auditees->random();
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
                    'due_date'          => $dueOffset !== null ? now()->addDays($dueOffset)->toDateString() : null,
                    'root_cause'        => in_array($st, ['waiting_approval','waiting_verification','closed'], true) ? 'Operator belum di-training SOP terbaru.' : null,
                    'corrective_action' => in_array($st, ['waiting_approval','waiting_verification','closed'], true) ? 'Refresh training, pasang poster, briefing harian.' : null,
                    'submitted_at'      => in_array($st, ['waiting_approval','waiting_verification','closed'], true) ? now()->subDays(2) : null,
                    'approved_at'       => in_array($st, ['waiting_verification','closed'], true) ? now()->subDay() : null,
                    'verified_at'       => $st === 'closed' ? now() : null,
                    'closed_at'         => $st === 'closed' ? now() : null,
                ]);
            }
        }

        $this->command?->info('Seeded '.count($samples).' audits with findings.');
    }
}
