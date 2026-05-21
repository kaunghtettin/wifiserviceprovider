<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsurePermission
{
    public function handle(Request $request, Closure $next, string $permissionKey)
    {
        $user = $request->user();

        if (!$user) {
            abort(401);
        }

        if (!$user->hasPermission($permissionKey)) {
            abort(403);
        }

        return $next($request);
    }
}

