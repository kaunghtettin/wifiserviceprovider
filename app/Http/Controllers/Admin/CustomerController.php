<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\WifiPackage;
use App\Services\Billing\MonthlyInvoiceGenerator;
use App\Services\Billing\PaymentRecorder;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    private const FILTERABLE_STATUSES = ['active', 'pending', 'suspended', 'disconnected'];

    private MonthlyInvoiceGenerator $invoiceGenerator;

    private PaymentRecorder $paymentRecorder;

    public function __construct(
        MonthlyInvoiceGenerator $invoiceGenerator,
        PaymentRecorder $paymentRecorder,
    ) {
        $this->invoiceGenerator = $invoiceGenerator;
        $this->paymentRecorder = $paymentRecorder;
    }

    private function canViewAllBranches(Request $request): bool
    {
        $user = $request->user();

        return (bool) $user?->canViewAllBranches();
    }

    private function getSelectableBranches(Request $request)
    {
        $user = $request->user();

        $branchIds = $user?->accessibleBranchIds() ?? [];

        return Branch::query()
            ->when(!$user?->canViewAllBranches(), fn ($query) => $query->whereIn('id', $branchIds))
            ->orderBy('name')
            ->get(['id', 'name']);
    }

    private function getFilterableBranches(Request $request)
    {
        if ($this->canViewAllBranches($request)) {
            return Branch::query()->orderBy('name')->get(['id', 'name']);
        }

        return [];
    }

    private function getSelectablePackages(Request $request)
    {
        $user = $request->user();

        $packagesQuery = WifiPackage::query()->orderBy('name');
        if (!$user?->canViewAllBranches()) {
            $branchIds = $user?->accessibleBranchIds() ?? [];
            $packagesQuery->where(function ($q) use ($branchIds) {
                $q->whereNull('branch_id');
                if (!empty($branchIds)) {
                    $q->orWhereIn('branch_id', $branchIds);
                }
            });
        }

        return $packagesQuery->get(['id', 'branch_id', 'name', 'speed_mbps']);
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $search = trim((string) $request->query('q', ''));
        $status = trim((string) $request->query('status', ''));
        $branchId = (int) $request->query('branch_id', 0);
        $packageId = (int) $request->query('package_id', 0);
        $perPage = max(10, min((int) $request->query('per_page', 15), 100));
        $canViewAllBranches = $this->canViewAllBranches($request);
        $userBranchIds = $user?->accessibleBranchIds() ?? [];

        $customersQuery = Customer::query()
            ->with(['branch:id,name', 'package:id,name,speed_mbps,branch_id'])
            ->orderByDesc('id');

        if (!$canViewAllBranches) {
            $customersQuery->whereIn('branch_id', $userBranchIds);
        } elseif ($branchId > 0) {
            $customersQuery->where('branch_id', $branchId);
        }

        if ($search !== '') {
            $customersQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('phone', 'like', '%'.$search.'%')
                    ->orWhere('customer_code', 'like', '%'.$search.'%')
                    ->orWhere('ftth_account_name', 'like', '%'.$search.'%')
                    ->orWhere('ftth_id', 'like', '%'.$search.'%')
                    ->orWhere('address', 'like', '%'.$search.'%');
            });
        }

        if (in_array($status, self::FILTERABLE_STATUSES, true)) {
            $customersQuery->where('status', $status);
        }

        if ($packageId > 0) {
            $customersQuery->where('wifi_package_id', $packageId);
        }

        $summaryQuery = clone $customersQuery;

        $customers = $customersQuery->paginate($perPage, [
            'id',
            'customer_code',
            'branch_id',
            'wifi_package_id',
            'name',
            'ftth_account_name',
            'ftth_id',
            'phone',
            'billing_day_of_month',
            'status',
            'installation_date',
            'router_sn',
            'created_at',
        ])->withQueryString();

        $branches = $this->getSelectableBranches($request);
        $filterBranches = $this->getFilterableBranches($request);
        $packages = $this->getSelectablePackages($request);

        return Inertia::render('Customers/Index', [
            'customers' => $customers,
            'summary' => [
                'total' => (clone $summaryQuery)->count(),
                'active' => (clone $summaryQuery)->where('status', 'active')->count(),
                'pending' => (clone $summaryQuery)->where('status', 'pending')->count(),
                'attention' => (clone $summaryQuery)->whereIn('status', ['suspended', 'disconnected'])->count(),
            ],
            'branches' => $branches,
            'filterBranches' => $filterBranches,
            'packages' => $packages,
            'canAssignBranch' => $canViewAllBranches || count($userBranchIds) > 1,
            'canFilterBranch' => $canViewAllBranches,
            'filters' => [
                'q' => $search,
                'status' => in_array($status, self::FILTERABLE_STATUSES, true) ? $status : '',
                'branch_id' => $canViewAllBranches && $branchId > 0 ? $branchId : '',
                'package_id' => $packageId > 0 ? $packageId : '',
                'per_page' => $perPage,
            ],
        ]);
    }

    public function show(Request $request, Customer $customer): Response
    {
        $invoicePerPage = max(10, min((int) $request->query('invoice_per_page', 10), 100));
        $paymentPerPage = max(10, min((int) $request->query('payment_per_page', 10), 100));

        $customer = $this->findScopedCustomer($request, $customer->id)
            ->load([
                'branch:id,name,code,phone,address',
                'package:id,name,speed_mbps,price,duration_months,status',
                'createdBy:id,name',
            ]);

        $invoiceHistory = $customer->invoices()
            ->orderByDesc('invoice_month')
            ->orderByDesc('id')
            ->paginate(
                $invoicePerPage,
                [
                'id',
                'invoice_number',
                'invoice_month',
                'due_date',
                'package_name',
                'total_amount',
                'paid_amount',
                'balance_amount',
                'status',
                'last_payment_at',
                ],
                'invoice_page'
            )
            ->withQueryString();

        $paymentHistory = $customer->payments()
            ->with([
                'invoice:id,invoice_number,invoice_month,status,balance_amount',
                'receivedBy:id,name',
            ])
            ->orderByDesc('paid_at')
            ->orderByDesc('id')
            ->paginate(
                $paymentPerPage,
                [
                'id',
                'payment_code',
                'invoice_id',
                'amount',
                'paid_at',
                'method',
                'reference_no',
                'notes',
                'received_by_user_id',
                ],
                'payment_page'
            )
            ->withQueryString();

        $invoiceSummaryQuery = $customer->invoices();
        $paymentSummaryQuery = $customer->payments();
        $openInvoices = $customer->invoices()
            ->whereIn('status', ['unpaid', 'partial', 'overdue'])
            ->orderByDesc('invoice_month')
            ->orderByDesc('id')
            ->get([
                'id',
                'invoice_number',
                'invoice_month',
                'due_date',
                'total_amount',
                'paid_amount',
                'balance_amount',
                'status',
            ]);
        $user = $request->user();

        return Inertia::render('Customers/Show', [
            'customer' => $customer,
            'invoiceHistory' => $invoiceHistory,
            'paymentHistory' => $paymentHistory,
            'openInvoices' => $openInvoices,
            'canOpenInvoiceModule' => (bool) ($user?->hasPermission('invoices.manage') || $user?->hasRole('super_admin')),
            'canOpenPaymentModule' => (bool) ($user?->hasPermission('payments.manage') || $user?->hasRole('super_admin')),
            'historyFilters' => [
                'invoice_page' => max((int) $request->query('invoice_page', 1), 1) > 1 ? max((int) $request->query('invoice_page', 1), 1) : '',
                'invoice_per_page' => $invoicePerPage,
                'payment_page' => max((int) $request->query('payment_page', 1), 1) > 1 ? max((int) $request->query('payment_page', 1), 1) : '',
                'payment_per_page' => $paymentPerPage,
            ],
            'summary' => [
                'invoice_count' => (clone $invoiceSummaryQuery)->count(),
                'payment_count' => (clone $paymentSummaryQuery)->count(),
                'total_billed' => (float) (clone $invoiceSummaryQuery)->sum('total_amount'),
                'total_paid' => (float) (clone $paymentSummaryQuery)->sum('amount'),
                'outstanding_balance' => (float) (clone $invoiceSummaryQuery)->sum('balance_amount'),
                'open_invoice_count' => (clone $invoiceSummaryQuery)->whereIn('status', ['unpaid', 'partial', 'overdue'])->count(),
                'last_payment_at' => (clone $paymentSummaryQuery)->max('paid_at'),
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $user = $request->user();

        $branches = $this->getSelectableBranches($request);
        $packages = $this->getSelectablePackages($request);
        $userBranchIds = $user?->accessibleBranchIds() ?? [];

        return Inertia::render('Customers/Form', [
            'mode' => 'create',
            'customer' => null,
            'branches' => $branches,
            'packages' => $packages,
            'canAssignBranch' => (bool) $user?->canViewAllBranches() || count($userBranchIds) > 1,
            'defaultBranchId' => count($userBranchIds) === 1 ? $userBranchIds[0] : null,
        ]);
    }

    public function edit(Request $request, Customer $customer): Response
    {
        $user = $request->user();
        $customer = $this->findScopedCustomer($request, $customer->id);

        $branches = $this->getSelectableBranches($request);
        $packages = $this->getSelectablePackages($request);
        $userBranchIds = $user?->accessibleBranchIds() ?? [];

        return Inertia::render('Customers/Form', [
            'mode' => 'edit',
            'customer' => $customer->only([
                'id',
                'customer_code',
                'branch_id',
                'wifi_package_id',
                'name',
                'ftth_account_name',
                'ftth_id',
                'phone',
                'nrc',
                'address',
                'gps_lat',
                'gps_lng',
                'installation_date',
                'billing_day_of_month',
                'router_sn',
                'status',
                'notes',
            ]),
            'branches' => $branches,
            'packages' => $packages,
            'canAssignBranch' => (bool) $user?->canViewAllBranches() || count($userBranchIds) > 1,
            'defaultBranchId' => count($userBranchIds) === 1 ? $userBranchIds[0] : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $branchId = (int) ($request->input('branch_id') ?: $user?->soleBranchId());

        if ($branchId <= 0 || !$user?->canAccessBranch($branchId)) {
            abort(422, 'Branch is required.');
        }

        $request->merge([
            'branch_id' => $branchId,
            'created_by_user_id' => $user?->id,
        ]);

        $data = $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'wifi_package_id' => [
                'nullable',
                'integer',
                Rule::exists('wifi_packages', 'id')->where(
                    fn ($query) => $query
                        ->whereNull('branch_id')
                        ->orWhere('branch_id', $branchId)
                ),
            ],
            'name' => ['required', 'string', 'max:255'],
            'ftth_account_name' => ['nullable', 'string', 'max:255'],
            'ftth_id' => ['nullable', 'string', 'max:128'],
            'phone' => ['required', 'string', 'max:64'],
            'nrc' => ['nullable', 'string', 'max:64'],
            'address' => ['nullable', 'string', 'max:2000'],
            'gps_lat' => ['nullable', 'numeric'],
            'gps_lng' => ['nullable', 'numeric'],
            'installation_date' => ['nullable', 'date'],
            'billing_day_of_month' => ['required', 'integer', 'min:1', 'max:31'],
            'router_sn' => ['nullable', 'string', 'max:128'],
            'status' => ['required', Rule::in(['active', 'pending', 'suspended', 'disconnected'])],
            'notes' => ['nullable', 'string', 'max:2000'],
            'created_by_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $customer = Customer::create($data);

        return redirect()
            ->route('admin.customers.show', $customer)
            ->with('success', 'Customer created. You can now generate the first invoice.');
    }

    public function generateInvoice(Request $request, Customer $customer): RedirectResponse
    {
        $customer = $this->findScopedCustomer($request, $customer->id)
            ->load('package:id,name,price');

        $data = $request->validate([
            'month' => ['required', 'date_format:Y-m'],
        ]);

        if ($customer->status !== 'active') {
            throw ValidationException::withMessages([
                'month' => 'Only active customers can be invoiced.',
            ]);
        }

        if (!$customer->package) {
            throw ValidationException::withMessages([
                'month' => 'Assign a package to this customer before generating an invoice.',
            ]);
        }

        $result = $this->invoiceGenerator->generateForCustomer(
            $customer,
            Carbon::createFromFormat('Y-m', $data['month'])->startOfMonth(),
            $request->user(),
        );

        if (!$result['created']) {
            return back()->with('warning', 'An invoice already exists for this customer and month.');
        }

        return back()->with('success', 'Customer invoice generated successfully.');
    }

    public function recordPayment(Request $request, Customer $customer): RedirectResponse
    {
        $customer = $this->findScopedCustomer($request, $customer->id);

        $data = $request->validate([
            'invoice_id' => ['required', 'integer'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'paid_at' => ['required', 'date'],
            'method' => ['required', Rule::in(['cash', 'bank_transfer', 'other'])],
            'reference_no' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $invoice = Invoice::query()
            ->where('customer_id', $customer->id)
            ->whereIn('status', ['unpaid', 'partial', 'overdue'])
            ->findOrFail($data['invoice_id']);

        $this->paymentRecorder->record($invoice, $data, $request->user());

        return back()->with('success', 'Payment recorded successfully.');
    }

    public function update(Request $request, Customer $customer): RedirectResponse
    {
        $user = $request->user();
        $customer = $this->findScopedCustomer($request, $customer->id);

        $branchId = (int) ($request->input('branch_id') ?: $customer->branch_id);
        if ($branchId <= 0 || !$user?->canAccessBranch($branchId)) {
            abort(422, 'Branch is required.');
        }

        $request->merge(['branch_id' => $branchId]);

        $data = $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'wifi_package_id' => [
                'nullable',
                'integer',
                Rule::exists('wifi_packages', 'id')->where(
                    fn ($query) => $query
                        ->whereNull('branch_id')
                        ->orWhere('branch_id', $branchId)
                ),
            ],
            'name' => ['required', 'string', 'max:255'],
            'ftth_account_name' => ['nullable', 'string', 'max:255'],
            'ftth_id' => ['nullable', 'string', 'max:128'],
            'phone' => ['required', 'string', 'max:64'],
            'nrc' => ['nullable', 'string', 'max:64'],
            'address' => ['nullable', 'string', 'max:2000'],
            'gps_lat' => ['nullable', 'numeric'],
            'gps_lng' => ['nullable', 'numeric'],
            'installation_date' => ['nullable', 'date'],
            'billing_day_of_month' => ['required', 'integer', 'min:1', 'max:31'],
            'router_sn' => ['nullable', 'string', 'max:128'],
            'status' => ['required', Rule::in(['active', 'pending', 'suspended', 'disconnected'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $customer->update($data);

        return redirect()->route('admin.customers.index');
    }

    public function destroy(Request $request, Customer $customer): RedirectResponse
    {
        $customer = $this->findScopedCustomer($request, $customer->id);

        $customer->delete();

        return redirect()->route('admin.customers.index');
    }

    private function findScopedCustomer(Request $request, int $customerId): Customer
    {
        $user = $request->user();
        $userBranchIds = $user?->accessibleBranchIds() ?? [];

        return Customer::query()
            ->when(
                !$this->canViewAllBranches($request),
                fn ($query) => $query->whereIn('branch_id', $userBranchIds)
            )
            ->findOrFail($customerId);
    }
}
