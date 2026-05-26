<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PerformanceController extends Controller
{
    private function canViewAllBranches(Request $request): bool
    {
        $user = $request->user();

        return (bool) ($user?->hasRole('super_admin') || $user?->hasPermission('branches.view_all'));
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $month = trim((string) $request->query('month', now()->format('Y-m')));
        $selectedBranchId = (int) $request->query('branch_id', 0);

        try {
            $monthStart = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        } catch (\Throwable $exception) {
            $monthStart = now()->startOfMonth();
            $month = $monthStart->format('Y-m');
        }

        $monthEnd = $monthStart->copy()->endOfMonth();
        $canViewAllBranches = $this->canViewAllBranches($request);
        $effectiveBranchId = $canViewAllBranches ? $selectedBranchId : (int) ($user?->branch_id ?: 0);

        $incomeQuery = Payment::query()->whereBetween('paid_at', [$monthStart->copy()->startOfDay(), $monthEnd->copy()->endOfDay()]);
        $expenseQuery = Expense::query()->whereBetween('expense_date', [$monthStart->toDateString(), $monthEnd->toDateString()]);
        $billedQuery = Invoice::query()->whereDate('invoice_month', $monthStart->toDateString());
        $overdueQuery = Invoice::query()
            ->where('balance_amount', '>', 0)
            ->whereDate('due_date', '<=', $monthEnd->toDateString());
        $customersQuery = Customer::query();
        $activeCustomersQuery = Customer::query()->where('status', 'active');

        if ($effectiveBranchId > 0) {
            $incomeQuery->where('branch_id', $effectiveBranchId);
            $expenseQuery->where('branch_id', $effectiveBranchId);
            $billedQuery->where('branch_id', $effectiveBranchId);
            $overdueQuery->where('branch_id', $effectiveBranchId);
            $customersQuery->where('branch_id', $effectiveBranchId);
            $activeCustomersQuery->where('branch_id', $effectiveBranchId);
        }

        $incomeTotal = (float) $incomeQuery->sum('amount');
        $expenseTotal = (float) $expenseQuery->sum('amount');
        $billedTotal = (float) $billedQuery->sum('total_amount');
        $overdueTotal = (float) $overdueQuery->sum('balance_amount');
        $totalCustomers = (int) $customersQuery->count();
        $activeCustomers = (int) $activeCustomersQuery->count();
        $netIncome = $incomeTotal - $expenseTotal;
        $collectionRate = $billedTotal > 0 ? round(($incomeTotal / $billedTotal) * 100, 1) : 0;
        $activeRatio = $totalCustomers > 0 ? round(($activeCustomers / $totalCustomers) * 100, 1) : 0;
        $avgIncomePerActiveCustomer = $activeCustomers > 0 ? round($incomeTotal / $activeCustomers, 2) : 0;

        $incomeByBranch = Payment::query()
            ->select('branch_id', DB::raw('SUM(amount) as income_total'))
            ->whereBetween('paid_at', [$monthStart->copy()->startOfDay(), $monthEnd->copy()->endOfDay()])
            ->when($effectiveBranchId > 0, fn ($query) => $query->where('branch_id', $effectiveBranchId))
            ->groupBy('branch_id')
            ->pluck('income_total', 'branch_id');

        $expenseByBranch = Expense::query()
            ->select('branch_id', DB::raw('SUM(amount) as expense_total'))
            ->whereBetween('expense_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->when($effectiveBranchId > 0, fn ($query) => $query->where('branch_id', $effectiveBranchId))
            ->groupBy('branch_id')
            ->pluck('expense_total', 'branch_id');

        $billedByBranch = Invoice::query()
            ->select('branch_id', DB::raw('SUM(total_amount) as billed_total'))
            ->whereDate('invoice_month', $monthStart->toDateString())
            ->when($effectiveBranchId > 0, fn ($query) => $query->where('branch_id', $effectiveBranchId))
            ->groupBy('branch_id')
            ->pluck('billed_total', 'branch_id');

        $overdueByBranch = Invoice::query()
            ->select('branch_id', DB::raw('SUM(balance_amount) as overdue_total'))
            ->where('balance_amount', '>', 0)
            ->whereDate('due_date', '<=', $monthEnd->toDateString())
            ->when($effectiveBranchId > 0, fn ($query) => $query->where('branch_id', $effectiveBranchId))
            ->groupBy('branch_id')
            ->pluck('overdue_total', 'branch_id');

        $totalCustomersByBranch = Customer::query()
            ->select('branch_id', DB::raw('COUNT(*) as total_customers'))
            ->when($effectiveBranchId > 0, fn ($query) => $query->where('branch_id', $effectiveBranchId))
            ->groupBy('branch_id')
            ->pluck('total_customers', 'branch_id');

        $activeCustomersByBranch = Customer::query()
            ->select('branch_id', DB::raw('COUNT(*) as active_customers'))
            ->where('status', 'active')
            ->when($effectiveBranchId > 0, fn ($query) => $query->where('branch_id', $effectiveBranchId))
            ->groupBy('branch_id')
            ->pluck('active_customers', 'branch_id');

        $branches = Branch::query()
            ->when($effectiveBranchId > 0, fn ($query) => $query->where('id', $effectiveBranchId))
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        $branchPerformance = $branches
            ->map(function ($branch) use (
                $incomeByBranch,
                $expenseByBranch,
                $billedByBranch,
                $overdueByBranch,
                $totalCustomersByBranch,
                $activeCustomersByBranch,
                $incomeTotal
            ) {
                $income = (float) ($incomeByBranch[$branch->id] ?? 0);
                $expenses = (float) ($expenseByBranch[$branch->id] ?? 0);
                $billed = (float) ($billedByBranch[$branch->id] ?? 0);
                $overdue = (float) ($overdueByBranch[$branch->id] ?? 0);
                $totalCustomers = (int) ($totalCustomersByBranch[$branch->id] ?? 0);
                $activeCustomers = (int) ($activeCustomersByBranch[$branch->id] ?? 0);
                $net = $income - $expenses;
                $collectionRate = $billed > 0 ? round(($income / $billed) * 100, 1) : 0;
                $activeRatio = $totalCustomers > 0 ? round(($activeCustomers / $totalCustomers) * 100, 1) : 0;
                $expenseRatio = $income > 0 ? round(($expenses / $income) * 100, 1) : ($expenses > 0 ? 100.0 : 0.0);
                $incomeShare = $incomeTotal > 0 ? round(($income / $incomeTotal) * 100, 1) : 0;
                $avgIncomePerActiveCustomer = $activeCustomers > 0 ? round($income / $activeCustomers, 2) : 0;

                return [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'code' => $branch->code,
                    'income' => $income,
                    'expenses' => $expenses,
                    'net_income' => $net,
                    'billed' => $billed,
                    'overdue_balance' => $overdue,
                    'total_customers' => $totalCustomers,
                    'active_customers' => $activeCustomers,
                    'collection_rate' => $collectionRate,
                    'active_ratio' => $activeRatio,
                    'expense_ratio' => $expenseRatio,
                    'income_share' => $incomeShare,
                    'avg_income_per_active_customer' => $avgIncomePerActiveCustomer,
                ];
            })
            ->sortByDesc('net_income')
            ->values();

        $trendMonths = collect(range(5, 0))
            ->map(function ($offset) use ($monthStart) {
                $point = $monthStart->copy()->subMonths($offset)->startOfMonth();

                return [
                    'key' => $point->format('Y-m'),
                    'label' => $point->format('M Y'),
                ];
            })
            ->values();

        $incomeTrend = Payment::query()
            ->selectRaw("DATE_FORMAT(paid_at, '%Y-%m') as ym, SUM(amount) as total")
            ->whereBetween('paid_at', [
                $monthStart->copy()->subMonths(5)->startOfMonth()->startOfDay(),
                $monthEnd->copy()->endOfDay(),
            ])
            ->when($effectiveBranchId > 0, fn ($query) => $query->where('branch_id', $effectiveBranchId))
            ->groupBy('ym')
            ->pluck('total', 'ym');

        $expenseTrend = Expense::query()
            ->selectRaw("DATE_FORMAT(expense_date, '%Y-%m') as ym, SUM(amount) as total")
            ->whereBetween('expense_date', [
                $monthStart->copy()->subMonths(5)->startOfMonth()->toDateString(),
                $monthEnd->toDateString(),
            ])
            ->when($effectiveBranchId > 0, fn ($query) => $query->where('branch_id', $effectiveBranchId))
            ->groupBy('ym')
            ->pluck('total', 'ym');

        $billedTrend = Invoice::query()
            ->selectRaw("DATE_FORMAT(invoice_month, '%Y-%m') as ym, SUM(total_amount) as total")
            ->whereBetween('invoice_month', [
                $monthStart->copy()->subMonths(5)->startOfMonth()->toDateString(),
                $monthStart->toDateString(),
            ])
            ->when($effectiveBranchId > 0, fn ($query) => $query->where('branch_id', $effectiveBranchId))
            ->groupBy('ym')
            ->pluck('total', 'ym');

        $trend = $trendMonths
            ->map(function ($monthPoint) use ($incomeTrend, $expenseTrend, $billedTrend) {
                $income = (float) ($incomeTrend[$monthPoint['key']] ?? 0);
                $expenses = (float) ($expenseTrend[$monthPoint['key']] ?? 0);
                $billed = (float) ($billedTrend[$monthPoint['key']] ?? 0);

                return [
                    'month' => $monthPoint['label'],
                    'income' => $income,
                    'expenses' => $expenses,
                    'billed' => $billed,
                    'net_income' => $income - $expenses,
                ];
            })
            ->values();

        $topNetBranch = $branchPerformance->sortByDesc('net_income')->first();
        $topCollectionBranch = $branchPerformance
            ->filter(fn ($branch) => $branch['billed'] > 0)
            ->sortByDesc('collection_rate')
            ->first();
        $topActiveBranch = $branchPerformance->sortByDesc('active_ratio')->first();
        $highestExpenseBranch = $branchPerformance->sortByDesc('expense_ratio')->first();

        $availableBranches = $canViewAllBranches
            ? Branch::query()->orderBy('name')->get(['id', 'name'])
            : [];

        return Inertia::render('Performance/Index', [
            'filters' => [
                'month' => $month,
                'branch_id' => $canViewAllBranches ? ($selectedBranchId ?: '') : '',
            ],
            'branches' => $availableBranches,
            'canFilterBranch' => $canViewAllBranches,
            'summary' => [
                'income_total' => $incomeTotal,
                'expense_total' => $expenseTotal,
                'net_income' => $netIncome,
                'billed_total' => $billedTotal,
                'overdue_total' => $overdueTotal,
                'total_customers' => $totalCustomers,
                'active_customers' => $activeCustomers,
                'collection_rate' => $collectionRate,
                'active_ratio' => $activeRatio,
                'avg_income_per_active_customer' => $avgIncomePerActiveCustomer,
                'profitable_branch_count' => $branchPerformance->where('net_income', '>', 0)->count(),
            ],
            'insights' => [
                'top_net_branch' => $topNetBranch,
                'top_collection_branch' => $topCollectionBranch,
                'top_active_branch' => $topActiveBranch,
                'highest_expense_branch' => $highestExpenseBranch,
            ],
            'branchPerformance' => $branchPerformance,
            'trend' => $trend,
        ]);
    }
}
