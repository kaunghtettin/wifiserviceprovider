<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureBranchWorkspace
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        $branchId = (int) $request->session()->get('active_branch_id', 0);

        if (
            !$user
            || $request->session()->get('workspace') !== 'branch'
            || $branchId < 1
            || !$user->canSelectBranch($branchId)
        ) {
            $request->session()->forget(['workspace', 'active_branch_id']);

            return redirect()->route('admin.workspaces.index');
        }

        return $next($request);
    }
}
