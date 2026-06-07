<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\Billing\PaymentRecorder;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Database\Eloquent\Builder;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    private PaymentRecorder $paymentRecorder;

    public function __construct(PaymentRecorder $paymentRecorder)
    {
        $this->paymentRecorder = $paymentRecorder;
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $search = trim((string) $request->query('q', ''));
        $method = trim((string) $request->query('method', ''));
        $month = trim((string) $request->query('month', now()->format('Y-m')));
        $perPage = max(10, min((int) $request->query('per_page', 15), 100));
        $branchIds = $user?->accessibleBranchIds() ?? [];

        $paymentsQuery = Payment::query()
            ->with([
                'branch:id,name',
                'customer:id,name,customer_code,phone',
                'invoice:id,invoice_number,status,balance_amount',
                'receivedBy:id,name',
            ])
            ->orderByDesc('paid_at')
            ->orderByDesc('id');

        if (!$user?->canViewAllBranches()) {
            $paymentsQuery->whereIn('branch_id', $branchIds);
        }

        if ($search !== '') {
            $paymentsQuery->where(function ($query) use ($search) {
                $query->where('payment_code', 'like', '%'.$search.'%')
                    ->orWhere('reference_no', 'like', '%'.$search.'%')
                    ->orWhereHas('customer', function ($customerQuery) use ($search) {
                        $customerQuery->where('name', 'like', '%'.$search.'%')
                            ->orWhere('customer_code', 'like', '%'.$search.'%')
                            ->orWhere('phone', 'like', '%'.$search.'%');
                    })
                    ->orWhereHas('invoice', function ($invoiceQuery) use ($search) {
                        $invoiceQuery->where('invoice_number', 'like', '%'.$search.'%');
                    });
            });
        }

        if ($method !== '') {
            $paymentsQuery->where('method', $method);
        }

        if ($month !== '') {
            try {
                $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
                $end = $start->copy()->endOfMonth();
                $paymentsQuery->whereBetween('paid_at', [$start, $end]);
            } catch (\Throwable $exception) {
            }
        }

        $payments = $paymentsQuery->paginate($perPage, [
            'id',
            'payment_code',
            'branch_id',
            'invoice_id',
            'customer_id',
            'amount',
            'paid_at',
            'method',
            'reference_no',
            'received_by_user_id',
            'created_at',
        ])->withQueryString();

        $openInvoicesQuery = Invoice::query()
            ->with('customer:id,name,customer_code')
            ->whereIn('status', ['unpaid', 'partial', 'overdue'])
            ->orderByDesc('invoice_month')
            ->orderByDesc('id');

        if (!$user?->canViewAllBranches()) {
            $openInvoicesQuery->whereIn('branch_id', $branchIds);
        }

        $openInvoices = $openInvoicesQuery->get([
            'id',
            'invoice_number',
            'customer_id',
            'invoice_month',
            'total_amount',
            'paid_amount',
            'balance_amount',
            'status',
        ]);

        $summaryQuery = Payment::query();
        if (!$user?->canViewAllBranches()) {
            $summaryQuery->whereIn('branch_id', $branchIds);
        }
        if ($month !== '') {
            try {
                $summaryStart = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
                $summaryEnd = $summaryStart->copy()->endOfMonth();
                $summaryQuery->whereBetween('paid_at', [$summaryStart, $summaryEnd]);
            } catch (\Throwable $exception) {
            }
        }

        return Inertia::render('Payments/Index', [
            'payments' => $payments,
            'openInvoices' => $openInvoices,
            'filters' => [
                'q' => $search,
                'method' => $method,
                'month' => $month,
                'per_page' => $perPage,
            ],
            'summary' => [
                'count' => (clone $summaryQuery)->count(),
                'amount' => (float) (clone $summaryQuery)->sum('amount'),
                'open_invoice_count' => $openInvoices->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'invoice_id' => ['required', 'integer', 'exists:invoices,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'paid_at' => ['required', 'date'],
            'method' => ['required', Rule::in(['cash', 'bank_transfer', 'other'])],
            'reference_no' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'return_to' => ['nullable', Rule::in(['back'])],
        ]);

        $invoice = Invoice::query()->with('customer')->findOrFail($data['invoice_id']);
        if (!$user?->canAccessBranch((int) $invoice->branch_id)) {
            abort(403);
        }

        $this->paymentRecorder->record($invoice, $data, $user);

        if (($data['return_to'] ?? null) === 'back') {
            return back()->with('success', 'Payment recorded successfully.');
        }

        return redirect()
            ->route('admin.payments.index', ['month' => Carbon::parse($data['paid_at'])->format('Y-m')])
            ->with('success', 'Payment recorded successfully.');
    }

    public function receipt(Request $request, Payment $payment): Response
    {
        $payment = $this->findScopedPayment($request, $payment->id)
            ->load([
                'branch:id,name,code,phone,address',
                'customer:id,name,customer_code,phone,address',
                'invoice:id,invoice_number,invoice_month,due_date,total_amount,paid_amount,balance_amount,status,package_name',
                'receivedBy:id,name',
            ]);

        return Inertia::render('Payments/Receipt', [
            'payment' => $payment,
        ]);
    }

    private function findScopedPayment(Request $request, int $paymentId): Payment
    {
        $user = $request->user();

        return Payment::query()
            ->when(
                !$user?->canViewAllBranches(),
                fn (Builder $query) => $query->whereIn('branch_id', $user?->accessibleBranchIds() ?? [])
            )
            ->findOrFail($paymentId);
    }
}
