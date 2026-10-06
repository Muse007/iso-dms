<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DepartmentController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('departments/index', [
            'departments' => Department::with('manager:id,name')->orderBy('name')->paginate(20),
            'managers'    => User::select('id', 'name', 'position')->where('status', 'active')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateData($request);
        Department::create($data);

        return back()->with('flash.success', 'Department created.');
    }

    public function update(Request $request, Department $department): RedirectResponse
    {
        $data = $this->validateData($request, $department->id);
        $department->update($data);

        return back()->with('flash.success', 'Department updated.');
    }

    public function destroy(Department $department): RedirectResponse
    {
        $department->delete();

        return back()->with('flash.success', "Department {$department->code} deleted.");
    }

    private function validateData(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'code'        => ['required', 'string', 'max:32', 'unique:departments,code'.($ignoreId ? ",$ignoreId" : '')],
            'name'        => ['required', 'string', 'max:120'],
            'parent_id'   => ['nullable', 'exists:departments,id'],
            'manager_id'  => ['nullable', 'exists:users,id'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active'   => ['boolean'],
        ]);
    }
}
