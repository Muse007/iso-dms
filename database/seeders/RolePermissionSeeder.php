<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // Resource × ability matrix
        $resources = [
            'department', 'user', 'role',
            'document', 'sop', 'work_instruction',
            'audit', 'finding', 'capa',
            'risk', 'kpi',
            'supplier', 'training', 'asset', 'calibration',
            'approval', 'report', 'activity-log',
        ];
        $abilities = ['view', 'create', 'update', 'delete', 'approve', 'export'];

        foreach ($resources as $r) {
            foreach ($abilities as $a) {
                Permission::firstOrCreate(['name' => "{$r}.{$a}", 'guard_name' => 'web']);
            }
        }

        // 6 roles per flowchart §2
        $roles = [
            'super_admin' => Permission::pluck('name')->all(),
            'qmr'         => array_filter(Permission::pluck('name')->all(),
                                fn ($p) => !str_starts_with($p, 'user.delete')
                                        && !str_starts_with($p, 'role.delete')),
            'director'    => ['document.view','document.update','document.approve','document.export',
                              'capa.view','capa.approve','audit.view','audit.approve',
                              'risk.view','risk.approve','kpi.view','report.view','report.export',
                              'approval.view','approval.approve'],
            'manager'     => ['document.view','document.create','document.update','document.approve',
                              'capa.view','capa.create','capa.update','capa.approve',
                              'audit.view','risk.view','risk.update','kpi.view',
                              'supplier.view','training.view','asset.view',
                              'approval.view','approval.approve'],
            'supervisor'  => ['document.view','document.create','document.update',
                              'capa.view','capa.create','capa.update',
                              'audit.view','risk.view','kpi.view',
                              'training.view','asset.view',
                              'approval.view','approval.approve'],
            'staff'       => ['document.view','document.create',
                              'capa.view','capa.create',
                              'risk.view','kpi.view','training.view','asset.view'],
            'auditor'     => ['document.view','audit.view','audit.create','audit.update',
                              'finding.view','finding.create','finding.update',
                              'capa.view','risk.view','report.view','report.export'],
            // Document Control mengelola dokumen ISO & membagikan/menghapus jadwal audit,
            // serta boleh membuat jadwal audit (audit.create).
            'document_control' => ['document.view','document.create','document.update','document.delete',
                              'document.approve','document.export','audit.create'],
        ];

        foreach ($roles as $name => $perms) {
            $role = Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
            $role->syncPermissions($perms);
        }
    }
}
