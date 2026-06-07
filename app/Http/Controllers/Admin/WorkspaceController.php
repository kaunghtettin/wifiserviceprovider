<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorkspaceController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $request->session()->forget(['workspace', 'active_branch_id']);

        $branches = $user->isSuperAdmin()
            ? Branch::query()->orderBy('name')->get()
            : $user->branches()
                ->whereNotNull('branch_user.role_id')
                ->orderBy('name')
                ->get();

        return Inertia::render('Workspaces/Select', [
            'branches' => $branches->map(function (Branch $branch) use ($user) {
                $role = $user->branchRole((int) $branch->id);

                return [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'code' => $branch->code,
                    'address' => $branch->address,
                    'phone' => $branch->phone,
                    'role' => $role?->name,
                ];
            })->values(),
            'canAccessGlobal' => $user->canAccessGlobalWorkspace(),
        ]);
    }

    public function selectBranch(Request $request, Branch $branch): RedirectResponse
    {
        abort_unless($request->user()->canSelectBranch((int) $branch->id), 403);

        $request->session()->put([
            'workspace' => 'branch',
            'active_branch_id' => (int) $branch->id,
        ]);

        return redirect()->route('admin.dashboard');
    }

    public function selectGlobal(Request $request): RedirectResponse
    {
        abort_unless($request->user()->canAccessGlobalWorkspace(), 403);

        $request->session()->put('workspace', 'global');
        $request->session()->forget('active_branch_id');

        if ($request->user()->hasPermission('reports.global')) {
            return redirect()->route('admin.global-summary.index');
        }

        if ($request->user()->hasPermission('branches.manage')) {
            return redirect()->route('admin.branches.index');
        }

        if ($request->user()->hasPermission('users.manage')) {
            return redirect()->route('admin.users.index');
        }

        return redirect()->route('admin.roles.index');
    }

    public function switch(Request $request): RedirectResponse
    {
        $request->session()->forget(['workspace', 'active_branch_id']);

        return redirect()->route('admin.workspaces.index');
    }
}
