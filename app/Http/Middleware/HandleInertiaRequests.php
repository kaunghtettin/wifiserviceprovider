<?php

namespace App\Http\Middleware;

use App\Models\Notification;
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
        $path = parse_url(url('/'), PHP_URL_PATH) ?: '';
        $base = rtrim($path, '/');
        $adminAppUrl = $base === '' ? '' : $base;

        return array_merge(parent::share($request), [
            'admin_app_url' => $adminAppUrl,
            'app_base' => $path,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
            ],
            'auth' => [
                'user' => $request->user(),
                'role' => fn () => $request->user()?->role?->name,
                'branch_id' => fn () => $request->user()?->branch_id,
                'permissions' => fn () => $request->user()?->role?->permissions?->pluck('key')?->values() ?? [],
                'is_super_admin' => fn () => (bool) $request->user()?->hasRole('super_admin'),
            ],
            'notifications' => [
                'unread_count' => function () use ($request) {
                    $user = $request->user();

                    if (!$user) {
                        return 0;
                    }

                    return Notification::query()
                        ->where('type', 'internal')
                        ->whereNull('read_at')
                        ->when(
                            !$user->hasRole('super_admin') && !$user->hasPermission('branches.view_all') && $user->branch_id,
                            fn ($query) => $query->where('branch_id', $user->branch_id)
                        )
                        ->count();
                },
            ],
        ]);
    }
}
