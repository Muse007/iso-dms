<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $users = User::with(['department:id,name', 'roles:id,name'])
            ->when($request->q, fn ($query, $s) => $query->where(fn ($qq) => $qq
                ->where('name', 'like', "%{$s}%")
                ->orWhere('email', 'like', "%{$s}%")
                ->orWhere('employee_no', 'like', "%{$s}%")
                ->orWhere('position', 'like', "%{$s}%")
                ->orWhere('phone', 'like', "%{$s}%")))
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn ($u) => [
                'id'             => $u->id,
                'name'           => $u->name,
                'email'          => $u->email,
                'position'       => $u->position,
                'employee_no'    => $u->employee_no,
                'phone'          => $u->phone,
                'address'        => $u->address,
                'status'         => $u->status,
                'department'     => $u->department ? ['id' => $u->department->id, 'name' => $u->department->name] : null,
                'department_id'  => $u->department_id,
                'roles'          => $u->roles->map(fn ($r) => ['id' => $r->id, 'name' => $r->name])->values(),
                'signature_path' => $u->signature_path,
                'signature_url'  => $u->signature_path ? Storage::url($u->signature_path) : null,
                'stamp_path'     => $u->stamp_path,
                'stamp_url'      => $u->stamp_path ? Storage::url($u->stamp_path) : null,
            ]);

        return Inertia::render('users/index', [
            'users'       => $users,
            'filters'     => $request->only(['q']),
            'departments' => Department::select('id', 'name')->orderBy('name')->get(),
            'roles'       => Role::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateData($request);

        $payload = collect($data)->except(['signature', 'stamp', 'roles', 'password'])->toArray();
        $payload['password'] = Hash::make($data['password']);

        if ($request->hasFile('signature')) {
            $payload['signature_path'] = $request->file('signature')->store('signatures', 'public');
        }
        if ($request->hasFile('stamp')) {
            $payload['stamp_path'] = $request->file('stamp')->store('stamps', 'public');
        }

        $user = User::create($payload);
        $user->syncRoles($data['roles'] ?? []);

        return back()->with('flash.success', "User {$user->email} created.");
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $this->validateData($request, $user->id);

        $payload = collect($data)->except(['signature', 'stamp', 'roles', 'password'])->toArray();
        if (!empty($data['password'])) {
            $payload['password'] = Hash::make($data['password']);
        }

        if ($request->hasFile('signature')) {
            if ($user->signature_path) Storage::disk('public')->delete($user->signature_path);
            $payload['signature_path'] = $request->file('signature')->store('signatures', 'public');
        }
        if ($request->hasFile('stamp')) {
            if ($user->stamp_path) Storage::disk('public')->delete($user->stamp_path);
            $payload['stamp_path'] = $request->file('stamp')->store('stamps', 'public');
        }

        $user->update($payload);
        $user->syncRoles($data['roles'] ?? []);

        return back()->with('flash.success', "User {$user->email} updated.");
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->id === auth()->id()) {
            return back()->with('flash.error', 'Cannot delete your own account.');
        }
        $user->delete();

        return back()->with('flash.success', "User {$user->email} deleted.");
    }

    private function validateData(Request $request, ?int $ignoreId = null): array
    {
        $passwordRule = $ignoreId ? ['nullable', 'string', 'min:8'] : ['required', 'string', 'min:8'];

        return $request->validate([
            'name'          => ['required', 'string', 'max:120'],
            'email'         => ['required', 'email', 'max:160', Rule::unique('users', 'email')->ignore($ignoreId)->whereNull('deleted_at')],
            'password'      => $passwordRule,
            'department_id' => ['nullable', 'exists:departments,id'],
            'employee_no'   => ['nullable', 'string', 'max:32', Rule::unique('users', 'employee_no')->ignore($ignoreId)->whereNull('deleted_at')],
            'position'      => ['nullable', 'string', 'max:120'],
            'phone'         => ['nullable', 'string', 'max:32'],
            'address'       => ['nullable', 'string', 'max:500'],
            'status'        => ['required', 'in:active,inactive,suspended'],
            'roles'         => ['array'],
            'roles.*'       => ['string', 'exists:roles,name'],
            'signature'     => ['nullable', 'image', 'mimes:png,jpg,jpeg', 'max:2048'],
            'stamp'         => ['nullable', 'image', 'mimes:png,jpg,jpeg', 'max:2048'],
        ]);
    }
}
