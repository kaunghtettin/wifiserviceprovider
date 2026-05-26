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

        $overdueInvoices = Invoice::query()
            ->with([
                'branch:id,name',
                'customer:id,name,customer_code,phone',
            ])
            ->where('balance_amount', '>', 0)
            ->whereDate('due_date', '<=', $monthEnd->toDateString())
            ->when($effectiveBranchId > 0, fn ($query) => $query->where('branch_id', $effectiveBranchId))
            ->orderByDesc('balance_amount')
            ->limit(8)
            ->get([
                'id',
                'invoice_number',
                'branch_id',
                'customer_id',
                'invoice_month',
                'due_date',
                'balance_amount',
                'status',
            ]);

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
            'overdueInvoices' => $overdueInvoices,
        ]);
    }
}
