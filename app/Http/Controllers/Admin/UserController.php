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
        $search = trim((string) $request->query('q', ''));

        $query = User::query()
            ->with(['branches:id,name,code', 'role:id,name,scope'])
            ->orderByDesc('id');

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', '%'.$search.'%')
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
        ])->map(function (User $user) {
            return [
                'id' => $user->id,
                'global_role_id' => $user->role_id,
                'global_role' => $user->role,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'status' => $user->status,
                'last_login_at' => $user->last_login_at,
                'branch_assignments' => $user->branches->map(fn (Branch $branch) => [
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                    'branch_code' => $branch->code,
                    'role_id' => $branch->pivot?->role_id,
                    'role_name' => $branch->pivot?->role_id
                        ? Role::query()->whereKey($branch->pivot->role_id)->value('name')
                        : null,
                ])->values(),
            ];
        });

        return Inertia::render('Users/Index', [
            'users' => $users,
            'branches' => Branch::query()->orderBy('name')->get(['id', 'name', 'code']),
            'branchRoles' => Role::query()->where('scope', 'branch')->orderBy('name')->get(['id', 'name']),
            'globalRoles' => Role::query()->where('scope', 'global')->orderBy('name')->get(['id', 'name']),
            'filters' => ['q' => $search],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateUser($request);
        $this->authorizeAssignments($request, $data);

        $user = User::create([
            'role_id' => $data['global_role_id'] ?? null,
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'status' => $data['status'],
            'password' => Hash::make($data['password']),
        ]);

        $user->branches()->sync($this->pivotAssignments($data['branch_assignments'] ?? []));

        return redirect()->route('admin.users.index');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        if ($request->user()->is($user)) {
            abort(422, 'Use Profile to update your own account.');
        }

        $data = $this->validateUser($request, $user);
        $this->authorizeAssignments($request, $data, $user);

        $user->fill([
            'role_id' => $data['global_role_id'] ?? null,
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'status' => $data['status'],
        ]);

        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }

        $user->save();
        $user->branches()->sync($this->pivotAssignments($data['branch_assignments'] ?? []));

        return redirect()->route('admin.users.index');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($request->user()->is($user)) {
            abort(422, 'You cannot delete your own account.');
        }

        if ($user->isSuperAdmin() && !$request->user()->isSuperAdmin()) {
            abort(403);
        }

        $user->delete();

        return redirect()->route('admin.users.index');
    }

    private function validateUser(Request $request, ?User $user = null): array
    {
        return $request->validate([
            'global_role_id' => ['nullable', 'integer', 'exists:roles,id'],
            'branch_assignments' => ['array'],
            'branch_assignments.*.branch_id' => ['required', 'integer', 'distinct', 'exists:branches,id'],
            'branch_assignments.*.role_id' => ['required', 'integer', 'exists:roles,id'],
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                $user ? Rule::unique('users', 'email')->ignore($user->id) : Rule::unique('users', 'email'),
            ],
            'phone' => ['nullable', 'string', 'max:64'],
            'status' => ['required', Rule::in(['active', 'disabled'])],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:6'],
        ]);
    }

    private function authorizeAssignments(Request $request, array $data, ?User $target = null): void
    {
        $globalRoleId = $data['global_role_id'] ?? null;
        if ($globalRoleId) {
            $globalRole = Role::query()->findOrFail($globalRoleId);
            abort_unless($globalRole->scope === 'global', 422, 'The global role is invalid.');

            if ($globalRole->name === 'super_admin' && !$request->user()->isSuperAdmin()) {
                abort(403);
            }
        }

        if ($target?->isSuperAdmin() && !$request->user()->isSuperAdmin()) {
            abort(403);
        }

        $branchRoleIds = collect($data['branch_assignments'] ?? [])->pluck('role_id')->unique();
        $validCount = Role::query()
            ->where('scope', 'branch')
            ->whereIn('id', $branchRoleIds)
            ->count();

        abort_unless($validCount === $branchRoleIds->count(), 422, 'Every branch must use a branch role.');
    }

    private function pivotAssignments(array $assignments): array
    {
        return collect($assignments)
            ->mapWithKeys(fn (array $assignment) => [
                (int) $assignment['branch_id'] => ['role_id' => (int) $assignment['role_id']],
            ])
            ->all();
    }
}
