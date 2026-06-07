<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
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
        [$month, $monthStart, $monthEnd, $asOfDate, $canViewAllBranches, $selectedBranchId, $effectiveBranchIds] = $this->resolveFilters($request);

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
        [$overdueAging, $overdueCustomers] = $this->buildOverdueCustomerAnalysis($asOfDate, $effectiveBranchIds);

        $branches = $canViewAllBranches
            ? Branch::query()->orderBy('name')->get(['id', 'name'])
            : [];

        return Inertia::render('Reports/Index', [
            'filters' => [
                'month' => $month,
                'as_of_date' => $asOfDate->toDateString(),
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
            'canManageCustomers' => (bool) $request->user()?->hasPermission('customers.manage'),
        ]);
    }

    public function overdue(Request $request): Response
    {
        [$month, $monthStart, $monthEnd, $asOfDate, $canViewAllBranches, $selectedBranchId, $effectiveBranchIds] = $this->resolveFilters($request);
        $perPage = max(10, min((int) $request->query('per_page', 15), 100));
        $search = trim((string) $request->query('q', ''));

        $overdueQuery = Invoice::query()
            ->with([
                'branch:id,name',
                'customer:id,name,customer_code,phone',
            ])
            ->where('balance_amount', '>', 0)
            ->whereDate('due_date', '<', $asOfDate->toDateString())
            ->when($effectiveBranchIds !== null, fn ($query) => $query->whereIn('branch_id', $effectiveBranchIds))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($searchQuery) use ($search) {
                    $searchQuery
                        ->where('invoice_number', 'like', '%'.$search.'%')
                        ->orWhereHas('customer', function ($customerQuery) use ($search) {
                            $customerQuery
                                ->where('name', 'like', '%'.$search.'%')
                                ->orWhere('customer_code', 'like', '%'.$search.'%')
                                ->orWhere('phone', 'like', '%'.$search.'%');
                        });
                });
            })
            ->orderBy('due_date')
            ->orderByDesc('balance_amount');

        $totalOverdueBalance = (float) (clone $overdueQuery)->sum('balance_amount');
        $overdueCustomerCount = (clone $overdueQuery)->reorder()->distinct()->count('customer_id');
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
        $overdueInvoices->getCollection()->transform(function (Invoice $invoice) use ($asOfDate) {
            $dueDate = $invoice->due_date instanceof Carbon
                ? $invoice->due_date->copy()->startOfDay()
                : Carbon::parse($invoice->due_date)->startOfDay();
            $invoice->setAttribute('days_overdue', $dueDate->diffInDays($asOfDate));

            return $invoice;
        });

        [$overdueAging] = $this->buildOverdueCustomerAnalysis($asOfDate, $effectiveBranchIds, $search);
        $branches = $canViewAllBranches
            ? Branch::query()->orderBy('name')->get(['id', 'name'])
            : [];

        return Inertia::render('Reports/Overdue', [
            'filters' => [
                'month' => $month,
                'as_of_date' => $asOfDate->toDateString(),
                'q' => $search,
                'branch_id' => $canViewAllBranches ? ($selectedBranchId ?: '') : '',
                'per_page' => $perPage,
            ],
            'branches' => $branches,
            'canFilterBranch' => $canViewAllBranches,
            'summary' => [
                'count' => $overdueInvoices->total(),
                'customer_count' => $overdueCustomerCount,
                'balance_amount' => round($totalOverdueBalance, 2),
            ],
            'overdueAging' => $overdueAging,
            'overdueInvoices' => $overdueInvoices,
            'canManageCustomers' => (bool) $request->user()?->hasPermission('customers.manage'),
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
        $today = now()->startOfDay();
        $asOfDate = $monthEnd->lessThan($today) ? $monthEnd->copy()->startOfDay() : $today;
        $canViewAllBranches = (bool) $user?->canViewAllBranches();
        $effectiveBranchIds = $canViewAllBranches
            ? ($selectedBranchId > 0 ? [$selectedBranchId] : null)
            : ($user?->accessibleBranchIds() ?? []);

        return [$month, $monthStart, $monthEnd, $asOfDate, $canViewAllBranches, $selectedBranchId, $effectiveBranchIds];
    }

    /**
     * @param  array<int, int>|null  $effectiveBranchIds
     */
    private function buildOverdueCustomerAnalysis(Carbon $asOfDate, ?array $effectiveBranchIds, string $search = ''): array
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
            ->whereDate('due_date', '<', $asOfDate->toDateString())
            ->when($effectiveBranchIds !== null, fn ($query) => $query->whereIn('branch_id', $effectiveBranchIds))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($searchQuery) use ($search) {
                    $searchQuery
                        ->where('invoice_number', 'like', '%'.$search.'%')
                        ->orWhereHas('customer', function ($customerQuery) use ($search) {
                            $customerQuery
                                ->where('name', 'like', '%'.$search.'%')
                                ->orWhere('customer_code', 'like', '%'.$search.'%')
                                ->orWhere('phone', 'like', '%'.$search.'%');
                        });
                });
            })
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
            ->map(function ($rows) use ($customersById, $branchesById, $asOfDate) {
                $firstRow = $rows->first();

                if (!$firstRow) {
                    return null;
                }

                $customer = $customersById->get($firstRow->customer_id);
                $branch = $branchesById->get($firstRow->branch_id);
                $oldestDueDate = Carbon::parse($rows->min('due_date'))->startOfDay();
                $daysOverdue = $oldestDueDate->diffInDays($asOfDate);

                return [
                    'customer_id' => (int) $firstRow->customer_id,
                    'branch_id' => (int) $firstRow->branch_id,
                    'days_overdue' => $daysOverdue,
                    'invoice_count' => $rows->count(),
                    'bucket_key' => $daysOverdue > 60 ? '61_plus_days' : ($daysOverdue > 30 ? '31_60_days' : '1_30_days'),
                    'overdue_balance' => round((float) $rows->sum(fn ($row) => (float) ($row->balance_amount ?? 0)), 2),
                    'oldest_due_date' => $oldestDueDate->toDateString(),
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
            ->sort(fn (array $left, array $right) => [$right['days_overdue'], $right['overdue_balance']] <=> [$left['days_overdue'], $left['overdue_balance']])
            ->values();

        $overdueAging = collect([
            ['key' => '1_30_days', 'label' => '1-30 days'],
            ['key' => '31_60_days', 'label' => '31-60 days'],
            ['key' => '61_plus_days', 'label' => '61+ days'],
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
