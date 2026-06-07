<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Invoice;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        [
            $month,
            $monthStart,
            $monthEnd,
            $asOfDate,
            $periodStart,
            $periodEnd,
            $canViewAllBranches,
            $selectedBranchId,
            $effectiveBranchIds,
        ] = $this->resolveFilters($request);

        $billedQuery = Invoice::query()->whereBetween('invoice_month', [$monthStart->toDateString(), $monthStart->toDateString()]);
        $paymentsQuery = Payment::query()->whereBetween('paid_at', [$monthStart->copy()->startOfDay(), $monthEnd->copy()->endOfDay()]);
        $overdueQuery = Invoice::query()
            ->where('balance_amount', '>', 0)
            ->whereDate('due_date', '<', $asOfDate->toDateString());

        if ($effectiveBranchIds !== null) {
            $billedQuery->whereIn('branch_id', $effectiveBranchIds);
            $paymentsQuery->whereIn('branch_id', $effectiveBranchIds);
            $overdueQuery->whereIn('branch_id', $effectiveBranchIds);
        }

        $billedAmount = (float) $billedQuery->sum('total_amount');
        $collectedAmount = (float) $paymentsQuery->sum('amount');
        $overdueAmount = (float) $overdueQuery->sum('balance_amount');
        $overdueCount = (clone $overdueQuery)->count();
        $collectionRate = $billedAmount > 0 ? round(($collectedAmount / $billedAmount) * 100, 1) : 0;

        $paidInvoiceCount = Invoice::query()
            ->whereDate('invoice_month', $monthStart->toDateString())
            ->where('status', 'paid')
            ->when($effectiveBranchIds !== null, fn ($query) => $query->whereIn('branch_id', $effectiveBranchIds))
            ->count();

        $partialInvoiceCount = Invoice::query()
            ->whereDate('invoice_month', $monthStart->toDateString())
            ->where('status', 'partial')
            ->when($effectiveBranchIds !== null, fn ($query) => $query->whereIn('branch_id', $effectiveBranchIds))
            ->count();

        $unpaidInvoiceCount = Invoice::query()
            ->whereDate('invoice_month', $monthStart->toDateString())
            ->whereIn('status', ['unpaid', 'overdue'])
            ->when($effectiveBranchIds !== null, fn ($query) => $query->whereIn('branch_id', $effectiveBranchIds))
            ->count();

        $yearStart = $monthStart->copy()->startOfYear();
        $yearEnd = $monthStart->copy()->endOfYear();

        $yearPayments = Payment::query()
            ->whereBetween('paid_at', [$yearStart->copy()->startOfDay(), $yearEnd->copy()->endOfDay()])
            ->when($effectiveBranchIds !== null, fn ($query) => $query->whereIn('branch_id', $effectiveBranchIds))
            ->get(['amount', 'paid_at']);

        $yearExpenses = Expense::query()
            ->whereBetween('expense_date', [$yearStart->toDateString(), $yearEnd->toDateString()])
            ->when($effectiveBranchIds !== null, fn ($query) => $query->whereIn('branch_id', $effectiveBranchIds))
            ->get(['amount', 'expense_date']);

        $salesByMonth = $yearPayments
            ->groupBy(fn (Payment $payment) => $payment->paid_at->format('n'))
            ->map(fn ($payments) => (float) $payments->sum('amount'));

        $expensesByMonth = $yearExpenses
            ->groupBy(fn (Expense $expense) => $expense->expense_date->format('n'))
            ->map(fn ($expenses) => (float) $expenses->sum('amount'));

        $yearlyTrend = collect(range(1, 12))->map(function (int $monthNumber) use ($monthStart, $salesByMonth, $expensesByMonth) {
            $sales = (float) ($salesByMonth[$monthNumber] ?? 0);
            $expenses = (float) ($expensesByMonth[$monthNumber] ?? 0);

            return [
                'month' => $monthStart->copy()->month($monthNumber)->format('M'),
                'month_number' => $monthNumber,
                'sales' => $sales,
                'expenses' => $expenses,
                'net_profit' => $sales - $expenses,
            ];
        })->values();

        $dailySalesByDay = Payment::query()
            ->whereBetween('paid_at', [$monthStart->copy()->startOfDay(), $monthEnd->copy()->endOfDay()])
            ->when($effectiveBranchIds !== null, fn ($query) => $query->whereIn('branch_id', $effectiveBranchIds))
            ->get(['amount', 'paid_at'])
            ->groupBy(fn (Payment $payment) => $payment->paid_at->format('j'))
            ->map(fn ($payments) => (float) $payments->sum('amount'));

        $dailySales = collect(range(1, $monthStart->daysInMonth))->map(fn (int $day) => [
            'day' => $day,
            'date' => $monthStart->copy()->day($day)->toDateString(),
            'sales' => (float) ($dailySalesByDay[$day] ?? 0),
        ])->values();

        $categoryNames = ExpenseCategory::query()->pluck('name', 'slug');
        $allTimeExpenseAnalysis = $this->expenseAnalysis(
            null,
            null,
            $effectiveBranchIds,
            $categoryNames
        );
        $periodExpenseAnalysis = $this->expenseAnalysis(
            $periodStart,
            $periodEnd,
            $effectiveBranchIds,
            $categoryNames
        );

        $branches = $canViewAllBranches
            ? Branch::query()->orderBy('name')->get(['id', 'name'])
            : [];

        return Inertia::render('Reports/Index', [
            'filters' => [
                'month' => $month,
                'as_of_date' => $asOfDate->toDateString(),
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodEnd->toDateString(),
                'branch_id' => $canViewAllBranches ? ($selectedBranchId ?: '') : '',
            ],
            'branches' => $branches,
            'canFilterBranch' => $canViewAllBranches,
            'summary' => [
                'billed_amount' => $billedAmount,
                'collected_amount' => $collectedAmount,
                'overdue_amount' => $overdueAmount,
                'overdue_count' => $overdueCount,
                'collection_rate' => $collectionRate,
                'paid_invoice_count' => $paidInvoiceCount,
                'partial_invoice_count' => $partialInvoiceCount,
                'unpaid_invoice_count' => $unpaidInvoiceCount,
            ],
            'yearlyTrend' => $yearlyTrend,
            'dailySales' => $dailySales,
            'expenseAnalysis' => [
                'all_time' => $allTimeExpenseAnalysis,
                'selected_period' => $periodExpenseAnalysis,
                'selected_period_total' => round((float) $periodExpenseAnalysis->sum('amount'), 2),
                'all_time_total' => round((float) $allTimeExpenseAnalysis->sum('amount'), 2),
            ],
        ]);
    }

    private function resolveFilters(Request $request): array
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
        try {
            $periodStart = Carbon::parse((string) $request->query('period_start', $monthStart->toDateString()))->startOfDay();
            $periodEnd = Carbon::parse((string) $request->query('period_end', $monthEnd->toDateString()))->endOfDay();

            if ($periodStart->greaterThan($periodEnd)) {
                throw new \InvalidArgumentException('Invalid report period.');
            }
        } catch (\Throwable $exception) {
            $periodStart = $monthStart->copy()->startOfDay();
            $periodEnd = $monthEnd->copy()->endOfDay();
        }
        $today = now()->startOfDay();
        $asOfDate = $monthEnd->lessThan($today) ? $monthEnd->copy()->startOfDay() : $today;
        $canViewAllBranches = (bool) $user?->canViewAllBranches();
        $effectiveBranchIds = $canViewAllBranches
            ? ($selectedBranchId > 0 ? [$selectedBranchId] : null)
            : ($user?->accessibleBranchIds() ?? []);

        return [
            $month,
            $monthStart,
            $monthEnd,
            $asOfDate,
            $periodStart,
            $periodEnd,
            $canViewAllBranches,
            $selectedBranchId,
            $effectiveBranchIds,
        ];
    }

    /**
     * @param  array<int, int>|null  $effectiveBranchIds
     * @param  \Illuminate\Support\Collection<string, string>  $categoryNames
     */
    private function expenseAnalysis(
        ?Carbon $periodStart,
        ?Carbon $periodEnd,
        ?array $effectiveBranchIds,
        $categoryNames
    ) {
        return Expense::query()
            ->selectRaw('category, COUNT(*) as expense_count, SUM(amount) as total_amount')
            ->when(
                $periodStart && $periodEnd,
                fn ($query) => $query->whereBetween('expense_date', [
                    $periodStart->toDateString(),
                    $periodEnd->toDateString(),
                ])
            )
            ->when($effectiveBranchIds !== null, fn ($query) => $query->whereIn('branch_id', $effectiveBranchIds))
            ->groupBy('category')
            ->orderByDesc('total_amount')
            ->get()
            ->map(fn ($row) => [
                'category' => $row->category,
                'label' => $categoryNames[$row->category] ?? str($row->category)->replace('_', ' ')->title()->value(),
                'count' => (int) $row->expense_count,
                'amount' => round((float) $row->total_amount, 2),
            ])
            ->values();
    }
}
