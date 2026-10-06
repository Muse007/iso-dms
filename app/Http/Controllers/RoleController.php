<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    private const PROTECTED = ['super_admin'];

    public function index(): Response
    {
        $roles = Role::with('permissions:id,name')
            ->withCount('users')
            ->orderBy('name')
            ->get()
            ->map(fn ($r) => [
                'id'              => $r->id,
                'name'            => $r->name,
                'guard_name'      => $r->guard_name,
                'users_count'     => $r->users_count,
                'permissions'     => $r->permissions->pluck('name')->values(),
                'is_protected'    => in_array($r->name, self::PROTECTED, true),
            ]);

        return Inertia::render('roles/index', [
            'roles'       => $roles,
            'permissions' => Permission::orderBy('name')->pluck('name'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateData($request);

        $role = Role::create(['name' => $data['name'], 'guard_name' => 'web']);
        $role->syncPermissions($data['permissions'] ?? []);

        return back()->with('flash.success', "Role {$role->name} created.");
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        $data = $this->validateData($request, $role->id);

        if (!in_array($role->name, self::PROTECTED, true)) {
            $role->update(['name' => $data['name']]);
        }
        $role->syncPermissions($data['permissions'] ?? []);

        return back()->with('flash.success', "Role {$role->name} updated.");
    }

    public function destroy(Role $role): RedirectResponse
    {
        if (in_array($role->name, self::PROTECTED, true)) {
            return back()->with('flash.error', "Role {$role->name} is protected.");
        }
        if ($role->users()->exists()) {
            return back()->with('flash.error', "Role {$role->name} still assigned to users.");
        }

        $role->delete();

        return back()->with('flash.success', "Role deleted.");
    }

    private function validateData(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'name'          => ['required', 'string', 'max:80', Rule::unique('roles', 'name')->ignore($ignoreId)],
            'permissions'   => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);
    }
}
