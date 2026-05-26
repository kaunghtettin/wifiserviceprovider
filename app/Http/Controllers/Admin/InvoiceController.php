<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Invoice;
use App\Services\Billing\MonthlyInvoiceGenerator;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Database\Eloquent\Builder;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    public function __construct(private MonthlyInvoiceGenerator $monthlyInvoiceGenerator)
    {
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $search = trim((string) $request->query('q', ''));
        $status = trim((string) $request->query('status', ''));
        $month = trim((string) $request->query('month', now()->format('Y-m')));
        $perPage = max(10, min((int) $request->query('per_page', 15), 100));

        $invoicesQuery = Invoice::query()
            ->with([
                'branch:id,name',
                'customer:id,name,customer_code,phone',
                'package:id,name,speed_mbps',
            ])
            ->orderByDesc('invoice_month')
            ->orderByDesc('id');

        if (!$user?->hasRole('super_admin') && !$user?->hasPermission('branches.view_all') && $user?->branch_id) {
            $invoicesQuery->where('branch_id', $user->branch_id);
        }

        if ($search !== '') {
            $invoicesQuery->where(function ($query) use ($search) {
                $query->where('invoice_number', 'like', '%'.$search.'%')
                    ->orWhereHas('customer', function ($customerQuery) use ($search) {
                        $customerQuery->where('name', 'like', '%'.$search.'%')
                            ->orWhere('customer_code', 'like', '%'.$search.'%')
                            ->orWhere('phone', 'like', '%'.$search.'%');
                    });
            });
        }

        if ($status !== '') {
            if ($status === 'warning') {
                $today = now()->startOfDay()->toDateString();
                $warningDeadline = now()->startOfDay()->addDays(7)->toDateString();

                $invoicesQuery
                    ->whereIn('status', ['unpaid', 'partial'])
                    ->whereBetween('due_date', [$today, $warningDeadline]);
            } else {
                $invoicesQuery->where('status', $status);
            }
        }

        if ($month !== '') {
            try {
                $invoiceMonth = Carbon::createFromFormat('Y-m', $month)->startOfMonth()->toDateString();
                $invoicesQuery->whereDate('invoice_month', $invoiceMonth);
            } catch (\Throwable $exception) {
            }
        }

        $invoices = $invoicesQuery->paginate($perPage, [
            'id',
            'invoice_number',
            'branch_id',
            'customer_id',
            'wifi_package_id',
            'invoice_month',
            'due_date',
            'package_name',
            'total_amount',
            'paid_amount',
            'balance_amount',
            'status',
            'last_payment_at',
            'created_at',
        ])->withQueryString();

        $summaryQuery = Invoice::query();
        if (!$user?->hasRole('super_admin') && !$user?->hasPermission('branches.view_all') && $user?->branch_id) {
            $summaryQuery->where('branch_id', $user->branch_id);
        }
        if ($month !== '') {
            try {
                $summaryMonth = Carbon::createFromFormat('Y-m', $month)->startOfMonth()->toDateString();
                $summaryQuery->whereDate('invoice_month', $summaryMonth);
            } catch (\Throwable $exception) {
            }
        }

        return Inertia::render('Invoices/Index', [
            'invoices' => $invoices,
            'filters' => [
                'q' => $search,
                'status' => in_array($status, ['paid', 'unpaid', 'partial', 'overdue', 'warning'], true) ? $status : '',
                'month' => $month,
                'per_page' => $perPage,
            ],
            'summary' => [
                'count' => (clone $summaryQuery)->count(),
                'total_amount' => (float) (clone $summaryQuery)->sum('total_amount'),
                'paid_amount' => (float) (clone $summaryQuery)->sum('paid_amount'),
                'overdue_count' => (clone $summaryQuery)->where('status', 'overdue')->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'month' => ['required', 'date_format:Y-m'],
            'customer_statuses' => ['nullable', 'array'],
            'customer_statuses.*' => [Rule::in(['active'])],
        ]);

        $invoiceMonth = Carbon::createFromFormat('Y-m', $data['month'])->startOfMonth();
        $statuses = ['active'];
        $branchId = !$user?->hasRole('super_admin') && !$user?->hasPermission('branches.view_all')
            ? (int) ($user?->branch_id ?: 0)
            : null;

        $result = $this->monthlyInvoiceGenerator->generate($invoiceMonth, $statuses, $user, $branchId);

        return redirect()
            ->route('admin.invoices.index', ['month' => $data['month']])
            ->with('success', "{$result['created_count']} invoice(s) generated.");
    }

    public function print(Request $request, Invoice $invoice): Response
    {
        $invoice = $this->findScopedInvoice($request, $invoice->id)
            ->load([
                'branch:id,name,code,phone,address',
                'customer:id,name,customer_code,phone,address,router_sn,billing_day_of_month',
                'generatedBy:id,name',
                'payments:id,invoice_id,payment_code,amount,paid_at,method,reference_no',
            ]);

        return Inertia::render('Invoices/Print', [
            'invoice' => $invoice,
        ]);
    }

    private function findScopedInvoice(Request $request, int $invoiceId): Invoice
    {
        $user = $request->user();

        return Invoice::query()
            ->when(
                !$user?->hasRole('super_admin') && !$user?->hasPermission('branches.view_all') && $user?->branch_id,
                fn (Builder $query) => $query->where('branch_id', $user->branch_id)
            )
            ->findOrFail($invoiceId);
    }
}
