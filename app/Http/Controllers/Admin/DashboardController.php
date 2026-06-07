<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\WifiPackage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $branchIds = $user?->accessibleBranchIds() ?? [];
        $canViewAllBranches = (bool) $user?->canViewAllBranches();
        $monthStart = now()->startOfMonth();
        $monthEnd = now()->endOfMonth();

        $canCustomers = (bool) $user?->hasPermission('customers.manage');
        $canInvoices = (bool) $user?->hasPermission('invoices.manage');
        $canPayments = (bool) $user?->hasPermission('payments.manage');
        $canExpenses = (bool) $user?->hasPermission('expenses.manage');
        $canBranches = (bool) $user?->hasPermission('branches.manage');
        $canUsers = (bool) $user?->hasPermission('users.manage');
        $canPackages = (bool) $user?->hasPermission('packages.manage');
        $canReports = (bool) $user?->hasPermission('dashboard.view');
        $canSeeBilling = $canCustomers || $canInvoices || $canPayments;

        $scope = fn (Builder $query): Builder => $query->when(
            !$canViewAllBranches,
            fn (Builder $scopedQuery) => $scopedQuery->whereIn('branch_id', $branchIds)
        );

        $cards = [];
        $attention = [];
        $recentCustomers = [];
        $recentPayments = [];

        if ($canCustomers) {
            $customerQuery = $scope(Customer::query());
            $totalCustomers = (clone $customerQuery)->count();
            $activeCustomers = (clone $customerQuery)->where('status', 'active')->count();
            $pendingCustomers = (clone $customerQuery)->where('status', 'pending')->count();

            $cards[] = [
                'key' => 'customers',
                'label' => 'Active customers',
                'value' => $activeCustomers,
                'format' => 'number',
                'helper' => "{$totalCustomers} total, {$pendingCustomers} pending setup",
                'tone' => 'success',
                'href' => '/customers?status=active',
            ];

            $attention[] = [
                'key' => 'pending_customers',
                'label' => 'Pending customers',
                'value' => $pendingCustomers,
                'helper' => 'Customers still waiting for activation or installation.',
                'tone' => $pendingCustomers > 0 ? 'warning' : 'success',
                'href' => '/customers?status=pending',
            ];

            $recentCustomers = (clone $customerQuery)
                ->with(['branch:id,name', 'package:id,name'])
                ->latest('id')
                ->limit(5)
                ->get([
                    'id',
                    'customer_code',
                    'branch_id',
                    'wifi_package_id',
                    'name',
                    'phone',
                    'status',
                    'created_at',
                ]);
        }

        if ($canSeeBilling) {
            $openInvoiceQuery = $scope(
                Invoice::query()
                    ->where('balance_amount', '>', 0)
            );
            $overdueInvoiceQuery = (clone $openInvoiceQuery)
                ->whereDate('due_date', '<', now()->toDateString());
            $dueSoonInvoiceQuery = (clone $openInvoiceQuery)
                ->whereDate('due_date', '>=', now()->toDateString())
                ->whereDate('due_date', '<=', now()->addDays(7)->toDateString());

            $outstandingBalance = (float) (clone $openInvoiceQuery)->sum('balance_amount');
            $openInvoiceCount = (clone $openInvoiceQuery)->count();
            $overdueCount = (clone $overdueInvoiceQuery)->count();
            $overdueBalance = (float) (clone $overdueInvoiceQuery)->sum('balance_amount');
            $dueSoonCount = (clone $dueSoonInvoiceQuery)->count();
            $dueSoonBalance = (float) (clone $dueSoonInvoiceQuery)->sum('balance_amount');
            $billingHref = $canReports ? '/reports/overdue' : ($canInvoices ? '/invoices?status=overdue' : '/customers');

            $cards[] = [
                'key' => 'outstanding',
                'label' => 'Outstanding balance',
                'value' => round($outstandingBalance, 2),
                'format' => 'currency',
                'helper' => "{$openInvoiceCount} open invoice(s)",
                'tone' => $overdueCount > 0 ? 'warning' : 'primary',
                'href' => $billingHref,
            ];

            $attention[] = [
                'key' => 'overdue',
                'label' => 'Overdue invoices',
                'value' => $overdueCount,
                'helper' => number_format($overdueBalance, 2).' outstanding past due.',
                'tone' => $overdueCount > 0 ? 'danger' : 'success',
                'href' => $billingHref,
            ];
            $attention[] = [
                'key' => 'due_soon',
                'label' => 'Due within 7 days',
                'value' => $dueSoonCount,
                'helper' => number_format($dueSoonBalance, 2).' approaching the due date.',
                'tone' => $dueSoonCount > 0 ? 'warning' : 'success',
                'href' => $canInvoices ? '/invoices?status=warning' : '/customers',
            ];
        }

        if ($canPayments) {
            $paymentQuery = $scope(
                Payment::query()
                    ->whereBetween('paid_at', [$monthStart->copy()->startOfDay(), $monthEnd->copy()->endOfDay()])
            );
            $paymentCount = (clone $paymentQuery)->count();
            $collectedAmount = (float) (clone $paymentQuery)->sum('amount');

            $cards[] = [
                'key' => 'collections',
                'label' => 'Collected this month',
                'value' => round($collectedAmount, 2),
                'format' => 'currency',
                'helper' => "{$paymentCount} payment(s) recorded",
                'tone' => 'primary',
                'href' => '/payments?month='.$monthStart->format('Y-m'),
            ];

            $recentPayments = $scope(
                Payment::query()
                    ->with([
                        'customer:id,name,customer_code',
                        'invoice:id,invoice_number',
                        'receivedBy:id,name',
                    ])
            )
                ->latest('paid_at')
                ->latest('id')
                ->limit(5)
                ->get([
                    'id',
                    'payment_code',
                    'branch_id',
                    'invoice_id',
                    'customer_id',
                    'amount',
                    'paid_at',
                    'method',
                    'received_by_user_id',
                ]);
        }

        if ($canExpenses) {
            $expenseQuery = $scope(
                Expense::query()
                    ->whereBetween('expense_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            );
            $expenseCount = (clone $expenseQuery)->count();
            $expenseAmount = (float) (clone $expenseQuery)->sum('amount');

            $cards[] = [
                'key' => 'expenses',
                'label' => 'Expenses this month',
                'value' => round($expenseAmount, 2),
                'format' => 'currency',
                'helper' => "{$expenseCount} expense record(s)",
                'tone' => 'danger',
                'href' => '/expenses?month='.$monthStart->format('Y-m'),
            ];
        }

        if ($canBranches) {
            $branchCount = Branch::query()
                ->when(!$canViewAllBranches, fn ($query) => $query->whereIn('id', $branchIds))
                ->count();

            $cards[] = [
                'key' => 'branches',
                'label' => 'Accessible branches',
                'value' => $branchCount,
                'format' => 'number',
                'helper' => $canViewAllBranches ? 'System-wide branch access' : 'Assigned operational scope',
                'tone' => 'secondary',
                'href' => '/branches',
            ];
        }

        if ($canPackages) {
            $inactivePackages = WifiPackage::query()
                ->when(!$canViewAllBranches, function ($query) use ($branchIds) {
                    $query->where(function ($packageQuery) use ($branchIds) {
                        $packageQuery->whereNull('branch_id')->orWhereIn('branch_id', $branchIds);
                    });
                })
                ->where('status', '!=', 'active')
                ->count();

            $attention[] = [
                'key' => 'inactive_packages',
                'label' => 'Inactive packages',
                'value' => $inactivePackages,
                'helper' => 'Plans currently unavailable for new customer assignment.',
                'tone' => $inactivePackages > 0 ? 'warning' : 'success',
                'href' => '/packages',
            ];
        }

        $shortcuts = collect([
            $canCustomers ? ['label' => 'Add customer', 'description' => 'Register a new subscriber.', 'href' => '/customers/create', 'icon' => 'customer_add', 'tone' => 'primary'] : null,
            $canCustomers ? ['label' => 'Find customer', 'description' => 'Open customer search and billing history.', 'href' => '/customers', 'icon' => 'customers', 'tone' => 'secondary'] : null,
            $canInvoices ? ['label' => 'Invoice ledger', 'description' => 'Review and generate monthly invoices.', 'href' => '/invoices', 'icon' => 'invoices', 'tone' => 'primary'] : null,
            $canPayments ? ['label' => 'Record payment', 'description' => 'Post a collection and print its receipt.', 'href' => '/payments', 'icon' => 'payments', 'tone' => 'success'] : null,
            $canExpenses ? ['label' => 'Record expense', 'description' => 'Add and review branch expenses.', 'href' => '/expenses', 'icon' => 'expenses', 'tone' => 'warning'] : null,
            $canReports ? ['label' => 'Overdue follow-up', 'description' => 'Prioritize customers with past-due balances.', 'href' => '/reports/overdue', 'icon' => 'overdue', 'tone' => 'danger'] : null,
            $canReports ? ['label' => 'Collection report', 'description' => 'Review billing and collection performance.', 'href' => '/reports', 'icon' => 'reports', 'tone' => 'secondary'] : null,
            $canPackages ? ['label' => 'Manage packages', 'description' => 'Maintain available service plans.', 'href' => '/packages', 'icon' => 'packages', 'tone' => 'secondary'] : null,
            $canUsers ? ['label' => 'Manage users', 'description' => 'Control staff accounts and assignments.', 'href' => '/users', 'icon' => 'users', 'tone' => 'secondary'] : null,
            $canBranches ? ['label' => 'Manage branches', 'description' => 'Maintain branch operating details.', 'href' => '/branches', 'icon' => 'branches', 'tone' => 'secondary'] : null,
        ])->filter()->values();

        $scopeLabel = $canViewAllBranches
            ? 'All branches'
            : (count($branchIds) === 1 ? '1 assigned branch' : count($branchIds).' assigned branches');

        return Inertia::render('Dashboard', [
            'dashboard' => [
                'scope_label' => $scopeLabel,
                'month_label' => $monthStart->format('F Y'),
                'cards' => $cards,
                'attention' => collect($attention)->take(4)->values(),
                'shortcuts' => $shortcuts,
                'recent_customers' => $recentCustomers,
                'recent_payments' => $recentPayments,
            ],
        ]);
    }
}
