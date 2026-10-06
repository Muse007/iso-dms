<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\Audit;
use App\Models\Department;
use App\Models\Kpi;
use App\Models\Supplier;
use App\Models\Training;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Thin index endpoints for remaining modules so the sidebar nav works end-to-end.
 * Replace with full controllers as each module is implemented.
 */
class ModulePlaceholderController extends Controller
{
    public function audits(): Response
    {
        return Inertia::render('audits/index', [
            'audits' => Audit::with('leadAuditor:id,name')->latest()->paginate(20),
        ]);
    }

    public function suppliers(): Response
    {
        return Inertia::render('suppliers/index', [
            'suppliers' => Supplier::latest()->paginate(20),
        ]);
    }

    public function trainings(): Response
    {
        return Inertia::render('trainings/index', [
            'trainings' => Training::with('department:id,name')->latest()->paginate(20),
        ]);
    }

    public function assets(): Response
    {
        return Inertia::render('assets/index', [
            'assets' => Asset::with('department:id,name')->latest()->paginate(20),
        ]);
    }

    public function kpis(): Response
    {
        return Inertia::render('kpis/index', [
            'kpis' => Kpi::with(['department:id,name', 'records'])->latest()->paginate(20),
        ]);
    }

    public function departments(): Response
    {
        return Inertia::render('departments/index', [
            'departments' => Department::with('manager:id,name')->paginate(20),
        ]);
    }

    public function users(): Response
    {
        return Inertia::render('users/index', [
            'users' => User::with(['department:id,name', 'roles:id,name'])->latest()->paginate(20),
        ]);
    }
}
