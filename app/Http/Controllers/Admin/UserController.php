<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $authUser = $request->user();
        $search = trim((string) $request->query('q', ''));

        $query = User::query()->with(['branches:id,name', 'role:id,name'])->orderByDesc('id');

        if (!$authUser?->hasRole('super_admin') && !$authUser?->hasPermission('branches.view_all')) {
            $authBranchIds = $authUser?->branches()->pluck('branches.id')->all() ?? [];
            if (!empty($authBranchIds)) {
                $query->whereHas('branches', function ($q) use ($authBranchIds) {
                    $q->whereIn('branches.id', $authBranchIds);
                });
            }
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%')
                    ->orWhere('phone', 'like', '%'.$search.'%');
            });
        }

        $users = $query->get([
            'id',
            'role_id',
            'name',
            'email',
            'phone',
            'status',
            'last_login_at',
            'created_at',
        ]);

        $branches = [];
        $roles = [];
        $canAssignBranch = false;
        $canAssignRole = false;

        if ($authUser?->hasRole('super_admin')) {
            $branches = Branch::query()->orderBy('name')->get(['id', 'name']);
            $roles = Role::query()->orderBy('name')->get(['id', 'name']);
            $canAssignBranch = true;
            $canAssignRole = true;
        } else {
            $roles = Role::query()
                ->whereIn('name', ['staff'])
                ->orderBy('name')
                ->get(['id', 'name']);
        }

        return Inertia::render('Users/Index', [
            'users' => $users,
            'branches' => $branches,
            'roles' => $roles,
            'canAssignBranch' => $canAssignBranch,
            'canAssignRole' => $canAssignRole,
            'filters' => ['q' => $search],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $authUser = $request->user();

        $roleId = $authUser?->hasRole('super_admin')
            ? ($request->input('role_id') ?: null)
            : Role::where('name', 'staff')->value('id');

        $request->merge(['role_id' => $roleId]);

        $data = $request->validate([
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'branch_ids' => ['array'],
            'branch_ids.*' => ['integer', 'exists:branches,id'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:64'],
            'status' => ['required', Rule::in(['active', 'disabled'])],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $targetRoleName = Role::where('id', $data['role_id'])->value('name');

        if (!$authUser?->hasRole('super_admin')) {
            if ($targetRoleName !== 'staff') {
                abort(403);
            }
        }

        $branchIds = $authUser?->hasRole('super_admin') ? ($data['branch_ids'] ?? []) : [];

        $user = User::create([
            'role_id' => $data['role_id'],
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'status' => $data['status'],
            'password' => Hash::make($data['password']),
        ]);

        if (!empty($branchIds)) {
            $user->branches()->sync($branchIds);
        }

        return redirect()->route('admin.users.index');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $authUser = $request->user();

        if ($authUser && $user->id === $authUser->id) {
            abort(422, 'Use Profile to update your own account.');
        }

        if (!$authUser?->hasRole('super_admin')) {
            $authBranchIds = $authUser?->branches()->pluck('branches.id')->all() ?? [];
            $targetBranchIds = $user->branches()->pluck('branches.id')->all() ?? [];
            if (!empty($authBranchIds) && empty(array_intersect($authBranchIds, $targetBranchIds))) {
                abort(403);
            }
        }

        if (!$authUser?->hasRole('super_admin') && $user->role?->name === 'super_admin') {
            abort(403);
        }

        $roleId = $authUser?->hasRole('super_admin') ? ($request->input('role_id') ?: null) : Role::where('name', 'staff')->value('id');

        $request->merge(['role_id' => $roleId]);

        $data = $request->validate([
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'branch_ids' => ['array'],
            'branch_ids.*' => ['integer', 'exists:branches,id'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:64'],
            'status' => ['required', Rule::in(['active', 'disabled'])],
            'password' => ['nullable', 'string', 'min:6'],
        ]);

        $targetRoleName = Role::where('id', $data['role_id'])->value('name');
        if (!$authUser?->hasRole('super_admin')) {
            if ($targetRoleName !== 'staff') {
                abort(403);
            }
        }

        $user->fill([
            'role_id' => $data['role_id'],
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'status' => $data['status'],
        ]);

        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }

        $user->save();

        if ($authUser?->hasRole('super_admin')) {
            $user->branches()->sync($data['branch_ids'] ?? []);
        }

        return redirect()->route('admin.users.index');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $authUser = $request->user();

        if ($authUser && $user->id === $authUser->id) {
            abort(422, 'You cannot delete your own account.');
        }

        if (!$authUser?->hasRole('super_admin')) {
            $authBranchIds = $authUser?->branches()->pluck('branches.id')->all() ?? [];
            $targetBranchIds = $user->branches()->pluck('branches.id')->all() ?? [];
            if (!empty($authBranchIds) && empty(array_intersect($authBranchIds, $targetBranchIds))) {
                abort(403);
            }
        }

        if ($user->role?->name === 'super_admin' && !$authUser?->hasRole('super_admin')) {
            abort(403);
        }

        $user->delete();

        return redirect()->route('admin.users.index');
    }
}

