<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Invoice;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        [$month, $monthStart, $monthEnd, $canViewAllBranches, $selectedBranchId, $effectiveBranchId] = $this->resolveFilters($request);

        $billedQuery = Invoice::query()->whereBetween('invoice_month', [$monthStart->toDateString(), $monthStart->toDateString()]);
        $paymentsQuery = Payment::query()->whereBetween('paid_at', [$monthStart->copy()->startOfDay(), $monthEnd->copy()->endOfDay()]);
        $overdueQuery = Invoice::query()
            ->where('balance_amount', '>', 0)
            ->whereDate('due_date', '<=', $monthEnd->toDateString());

        if ($effectiveBranchId > 0) {
            $billedQuery->where('branch_id', $effectiveBranchId);
            $paymentsQuery->where('branch_id', $effectiveBranchId);
            $overdueQuery->where('branch_id', $effectiveBranchId);
        }

        $billedAmount = (float) $billedQuery->sum('total_amount');
        $collectedAmount = (float) $paymentsQuery->sum('amount');
        $overdueAmount = (float) $overdueQuery->sum('balance_amount');
        $overdueCount = (clone $overdueQuery)->count();
        $collectionRate = $billedAmount > 0 ? round(($collectedAmount / $billedAmount) * 100, 1) : 0;

        $paidInvoiceCount = Invoice::query()
            ->whereDate('invoice_month', $monthStart->toDateString())
            ->where('status', 'paid')
            ->when($effectiveBranchId > 0, fn ($query) => $query->where('branch_id', $effectiveBranchId))
            ->count();

        $partialInvoiceCount = Invoice::query()
            ->whereDate('invoice_month', $monthStart->toDateString())
            ->where('status', 'partial')
            ->when($effectiveBranchId > 0, fn ($query) => $query->where('branch_id', $effectiveBranchId))
            ->count();

        $unpaidInvoiceCount = Invoice::query()
            ->whereDate('invoice_month', $monthStart->toDateString())
            ->whereIn('status', ['unpaid', 'overdue'])
            ->when($effectiveBranchId > 0, fn ($query) => $query->where('branch_id', $effectiveBranchId))
            ->count();
        [$overdueAging, $overdueCustomers] = $this->buildOverdueCustomerAnalysis($monthEnd, $effectiveBranchId);

        $branches = $canViewAllBranches
            ? Branch::query()->orderBy('name')->get(['id', 'name'])
            : [];

        return Inertia::render('Reports/Index', [
            'filters' => [
                'month' => $month,
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
            'overdueAging' => $overdueAging,
            'overdueCustomers' => $overdueCustomers,
        ]);
    }

    public function overdue(Request $request): Response
    {
        [$month, $monthStart, $monthEnd, $canViewAllBranches, $selectedBranchId, $effectiveBranchId] = $this->resolveFilters($request);
        $perPage = max(10, min((int) $request->query('per_page', 15), 100));

        $overdueQuery = Invoice::query()
            ->with([
                'branch:id,name',
                'customer:id,name,customer_code,phone',
            ])
            ->where('balance_amount', '>', 0)
            ->whereDate('due_date', '<=', $monthEnd->toDateString())
            ->when($effectiveBranchId > 0, fn ($query) => $query->where('branch_id', $effectiveBranchId))
            ->orderBy('due_date')
            ->orderByDesc('balance_amount');

        $totalOverdueBalance = (float) (clone $overdueQuery)->sum('balance_amount');
        $overdueInvoices = $overdueQuery->paginate($perPage, [
            'id',
            'invoice_number',
            'branch_id',
            'customer_id',
            'invoice_month',
            'due_date',
            'balance_amount',
            'status',
        ])->withQueryString();

        [$overdueAging, $overdueCustomers] = $this->buildOverdueCustomerAnalysis($monthEnd, $effectiveBranchId);
        $branches = $canViewAllBranches
            ? Branch::query()->orderBy('name')->get(['id', 'name'])
            : [];

        return Inertia::render('Reports/Overdue', [
            'filters' => [
                'month' => $month,
                'branch_id' => $canViewAllBranches ? ($selectedBranchId ?: '') : '',
                'per_page' => $perPage,
            ],
            'branches' => $branches,
            'canFilterBranch' => $canViewAllBranches,
            'summary' => [
                'count' => $overdueInvoices->total(),
                'balance_amount' => round($totalOverdueBalance, 2),
            ],
            'overdueAging' => $overdueAging,
            'overdueInvoices' => $overdueInvoices,
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
        $canViewAllBranches = (bool) ($user?->hasRole('super_admin') || $user?->hasPermission('branches.view_all'));
        $effectiveBranchId = $canViewAllBranches ? $selectedBranchId : (int) ($user?->branch_id ?: 0);

        return [$month, $monthStart, $monthEnd, $canViewAllBranches, $selectedBranchId, $effectiveBranchId];
    }

    private function buildOverdueCustomerAnalysis(Carbon $monthEnd, int $effectiveBranchId): array
    {
        $overdueInvoiceRows = Invoice::query()
            ->select([
                'customer_id',
                'branch_id',
                'invoice_month',
                'due_date',
                'balance_amount',
            ])
            ->where('balance_amount', '>', 0)
            ->whereDate('due_date', '<=', $monthEnd->toDateString())
            ->when($effectiveBranchId > 0, fn ($query) => $query->where('branch_id', $effectiveBranchId))
            ->orderByDesc('invoice_month')
            ->orderByDesc('due_date')
            ->get();

        $customersById = \App\Models\Customer::query()
            ->whereIn('id', $overdueInvoiceRows->pluck('customer_id')->filter()->unique()->values())
            ->get(['id', 'name', 'customer_code', 'phone', 'status'])
            ->keyBy('id');

        $branchesById = Branch::query()
            ->whereIn('id', $overdueInvoiceRows->pluck('branch_id')->filter()->unique()->values())
            ->get(['id', 'name'])
            ->keyBy('id');

        $overdueCustomers = $overdueInvoiceRows
            ->groupBy(fn ($row) => "{$row->customer_id}:{$row->branch_id}")
            ->map(function ($rows) use ($customersById, $branchesById) {
                $orderedRows = $rows
                    ->sortByDesc(fn ($row) => optional($row->invoice_month)->timestamp ?? strtotime((string) $row->invoice_month))
                    ->values();
                $firstRow = $orderedRows->first();

                if (!$firstRow) {
                    return null;
                }

                $customer = $customersById->get($firstRow->customer_id);
                $branch = $branchesById->get($firstRow->branch_id);
                $expectedMonth = $firstRow->invoice_month instanceof Carbon
                    ? $firstRow->invoice_month->copy()->startOfMonth()
                    : Carbon::parse($firstRow->invoice_month)->startOfMonth();
                $streakRows = collect();

                foreach ($orderedRows as $row) {
                    $invoiceMonth = $row->invoice_month instanceof Carbon
                        ? $row->invoice_month->copy()->startOfMonth()
                        : Carbon::parse($row->invoice_month)->startOfMonth();

                    if (!$invoiceMonth->equalTo($expectedMonth)) {
                        break;
                    }

                    $streakRows->push($row);
                    $expectedMonth = $expectedMonth->copy()->subMonthNoOverflow()->startOfMonth();
                }

                $monthsOverdue = max($streakRows->count(), 1);

                return [
                    'customer_id' => (int) $firstRow->customer_id,
                    'branch_id' => (int) $firstRow->branch_id,
                    'months_overdue' => $monthsOverdue,
                    'bucket_key' => $monthsOverdue >= 3 ? '3_plus_months' : "{$monthsOverdue}_month",
                    'overdue_balance' => round((float) $streakRows->sum(fn ($row) => (float) ($row->balance_amount ?? 0)), 2),
                    'oldest_due_date' => $streakRows->min('due_date'),
                    'customer' => $customer ? [
                        'id' => $customer->id,
                        'name' => $customer->name,
                        'customer_code' => $customer->customer_code,
                        'phone' => $customer->phone,
                        'status' => $customer->status,
                    ] : null,
                    'branch' => $branch ? [
                        'id' => $branch->id,
                        'name' => $branch->name,
                    ] : null,
                ];
            })
            ->filter()
            ->sort(fn (array $left, array $right) => [$right['months_overdue'], $right['overdue_balance']] <=> [$left['months_overdue'], $left['overdue_balance']])
            ->values();

        $overdueAging = collect([
            ['key' => '1_month', 'label' => '1 month'],
            ['key' => '2_month', 'label' => '2 months'],
            ['key' => '3_plus_months', 'label' => '3+ months'],
        ])->map(function (array $bucket) use ($overdueCustomers) {
            $matches = $overdueCustomers->where('bucket_key', $bucket['key']);

            return [
                'key' => $bucket['key'],
                'label' => $bucket['label'],
                'customer_count' => $matches->count(),
                'balance_amount' => round((float) $matches->sum('overdue_balance'), 2),
            ];
        })->values();

        return [$overdueAging, $overdueCustomers];
    }
}
