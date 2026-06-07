<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    public function index(): Response
    {
        $roles = Role::query()
            ->withCount('users')
            ->withCount('branchUsers')
            ->with(['permissions:id,key'])
            ->orderBy('name')
            ->get(['id', 'name', 'scope', 'description', 'created_at']);

        $permissions = Permission::query()
            ->orderBy('key')
            ->get(['id', 'key', 'description']);

        return Inertia::render('Roles/Index', [
            'roles' => $roles->map(function (Role $role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'scope' => $role->scope,
                    'description' => $role->description,
                    'users_count' => $role->scope === 'global'
                        ? $role->users_count
                        : $role->branch_users_count,
                    'permission_keys' => $role->permissions->pluck('key')->values(),
                    'created_at' => $role->created_at,
                ];
            }),
            'permissions' => $permissions,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'alpha_dash', 'unique:roles,name'],
            'scope' => ['required', Rule::in(['global', 'branch'])],
            'description' => ['nullable', 'string', 'max:2000'],
            'permission_keys' => ['array'],
            'permission_keys.*' => ['string', Rule::exists('permissions', 'key')],
        ]);

        $role = Role::create([
            'name' => $data['name'],
            'scope' => $data['scope'],
            'description' => $data['description'] ?? null,
        ]);

        $permissionIds = Permission::query()
            ->whereIn('key', $data['permission_keys'] ?? [])
            ->pluck('id');

        $role->permissions()->sync($permissionIds);

        return redirect()->route('admin.roles.index');
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        if ($role->name === 'super_admin') {
            abort(403);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'alpha_dash', Rule::unique('roles', 'name')->ignore($role->id)],
            'scope' => ['required', Rule::in(['global', 'branch'])],
            'description' => ['nullable', 'string', 'max:2000'],
            'permission_keys' => ['array'],
            'permission_keys.*' => ['string', Rule::exists('permissions', 'key')],
        ]);

        if ($role->name !== $data['name']) {
            abort(422, 'Role name cannot be changed.');
        }

        if ($role->scope !== $data['scope']) {
            abort(422, 'Role scope cannot be changed after creation.');
        }

        $role->update(['description' => $data['description'] ?? null]);

        $permissionIds = Permission::query()
            ->whereIn('key', $data['permission_keys'] ?? [])
            ->pluck('id');

        $role->permissions()->sync($permissionIds);

        return redirect()->route('admin.roles.index');
    }

    public function destroy(Role $role): RedirectResponse
    {
        if ($role->name === 'super_admin') {
            abort(403);
        }

        $role->loadCount('users');
        $role->loadCount('branchUsers');
        if (($role->users_count ?? 0) > 0 || ($role->branch_users_count ?? 0) > 0) {
            abort(422, 'Role has users.');
        }

        $role->delete();

        return redirect()->route('admin.roles.index');
    }
}
