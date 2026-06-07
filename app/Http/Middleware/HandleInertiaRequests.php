<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): string|null
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $appUrl = rtrim((string) config('app.url'), '/');
        $path = parse_url($appUrl, PHP_URL_PATH) ?: '';
        $base = rtrim($path, '/');

        $user = $request->user();
        $activeRole = $user?->activeRole();
        $activeRole?->loadMissing('permissions');
        $activeBranch = $user?->activeBranch();

        return array_merge(parent::share($request), [
            'admin_app_url' => $appUrl,
            'app_base' => $base,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
            ],
            'auth' => [
                'user' => $user,
                'workspace' => $user?->workspace(),
                'role' => $activeRole?->name,
                'branch' => $activeBranch ? [
                    'id' => $activeBranch->id,
                    'name' => $activeBranch->name,
                    'code' => $activeBranch->code,
                ] : null,
                'branch_id' => $user?->activeBranchId(),
                'branch_ids' => fn () => $user?->accessibleBranchIds() ?? [],
                'permissions' => $activeRole?->permissions?->pluck('key')?->values() ?? [],
                'is_super_admin' => (bool) $user?->isSuperAdmin(),
                'can_access_global' => (bool) $user?->canAccessGlobalWorkspace(),
            ],
        ]);
    }
}
