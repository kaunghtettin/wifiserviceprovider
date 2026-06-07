<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureGlobalWorkspace
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (
            !$user
            || $request->session()->get('workspace') !== 'global'
            || !$user->canAccessGlobalWorkspace()
        ) {
            $request->session()->forget(['workspace', 'active_branch_id']);

            return redirect()->route('admin.workspaces.index');
        }

        return $next($request);
    }
}
