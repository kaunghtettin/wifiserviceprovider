<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\User;
use App\Models\WifiPackage;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $branchesCount = Branch::query()->count();
        $usersCount = User::query()->count();

        $packagesQuery = WifiPackage::query();
        $customersQuery = Customer::query();

        if (!$user?->hasRole('super_admin') && !$user?->hasPermission('branches.view_all') && $user?->branch_id) {
            $packagesQuery->where(function ($q) use ($user) {
                $q->whereNull('branch_id')->orWhere('branch_id', $user->branch_id);
            });
            $customersQuery->where('branch_id', $user->branch_id);
        }

        $packagesCount = $packagesQuery->count();
        $customersCount = $customersQuery->count();

        return Inertia::render('Dashboard', [
            'stats' => [
                'branches' => $branchesCount,
                'users' => $usersCount,
                'packages' => $packagesCount,
                'customers' => $customersCount,
            ],
            'progress' => [
                'phase' => 'Phase 1 (MVP)',
                'done' => [
                    'Authentication (login/logout) + seeded Super Admin',
                    'RBAC foundation (roles, permissions, middleware)',
                    'Branch management (CRUD)',
                    'WiFi package management (CRUD + active/inactive)',
                    'Customer management (CRUD + search + responsive mobile flow)',
                ],
                'next' => [
                    'Monthly invoices (generation + listing)',
                    'Payments (manual entry + receipt workflow)',
                    'Expenses (tracking + categories)',
                    'Notifications/SMS (Phase 2)',
                ],
            ],
        ]);
    }
}

