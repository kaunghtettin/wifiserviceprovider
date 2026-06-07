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

        return array_merge(parent::share($request), [
            'admin_app_url' => $appUrl,
            'app_base' => $base,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
            ],
            'auth' => [
                'user' => $request->user(),
                'role' => fn () => $request->user()?->role?->name,
                'branch_id' => fn () => $request->user()?->soleBranchId(),
                'branch_ids' => fn () => $request->user()?->accessibleBranchIds() ?? [],
                'permissions' => fn () => $request->user()?->role?->permissions?->pluck('key')?->values() ?? [],
                'is_super_admin' => fn () => (bool) $request->user()?->hasRole('super_admin'),
            ],
        ]);
    }
}
