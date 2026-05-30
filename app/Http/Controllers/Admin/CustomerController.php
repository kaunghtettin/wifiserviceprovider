<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\WifiPackage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    private const FILTERABLE_STATUSES = ['active', 'pending', 'suspended', 'disconnected'];

    private function canViewAllBranches(Request $request): bool
    {
        $user = $request->user();

        return (bool) ($user?->hasRole('super_admin') || $user?->hasPermission('branches.view_all'));
    }

    private function getSelectableBranches(Request $request)
    {
        $user = $request->user();

        if ($user?->hasRole('super_admin')) {
            return Branch::query()->orderBy('name')->get(['id', 'name']);
        }

        return [];
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
        if (!$user?->hasRole('super_admin') && !$user?->hasPermission('branches.view_all')) {
            $branchIds = $user?->branches()->pluck('branches.id')->all() ?? [];
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
        $perPage = max(10, min((int) $request->query('per_page', 15), 100));
        $canViewAllBranches = $this->canViewAllBranches($request);

        $customersQuery = Customer::query()
            ->with(['branch:id,name', 'package:id,name,speed_mbps,branch_id'])
            ->orderByDesc('id');

        if (!$canViewAllBranches) {
            $userBranchIds = $user?->branches()->pluck('branches.id')->all() ?? [];
            if (!empty($userBranchIds)) {
                $customersQuery->whereIn('branch_id', $userBranchIds);
            }
        } elseif ($branchId > 0) {
            $customersQuery->where('branch_id', $branchId);
        }

        if ($search !== '') {
            $customersQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('phone', 'like', '%'.$search.'%')
                    ->orWhere('customer_code', 'like', '%'.$search.'%');
            });
        }

        if (in_array($status, self::FILTERABLE_STATUSES, true)) {
            $customersQuery->where('status', $status);
        }

        $summaryQuery = clone $customersQuery;

        $customers = $customersQuery->paginate($perPage, [
            'id',
            'customer_code',
            'branch_id',
            'wifi_package_id',
            'name',
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
            'canAssignBranch' => (bool) $user?->hasRole('super_admin'),
            'canFilterBranch' => $canViewAllBranches,
            'filters' => [
                'q' => $search,
                'status' => in_array($status, self::FILTERABLE_STATUSES, true) ? $status : '',
                'branch_id' => $canViewAllBranches && $branchId > 0 ? $branchId : '',
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

        return Inertia::render('Customers/Show', [
            'customer' => $customer,
            'invoiceHistory' => $invoiceHistory,
            'paymentHistory' => $paymentHistory,
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
        $userBranchIds = $user?->branches()->pluck('branches.id')->all() ?? [];

        return Inertia::render('Customers/Form', [
            'mode' => 'create',
            'customer' => null,
            'branches' => $branches,
            'packages' => $packages,
            'canAssignBranch' => (bool) $user?->hasRole('super_admin'),
            'defaultBranchId' => count($userBranchIds) === 1 ? $userBranchIds[0] : null,
        ]);
    }

    public function edit(Request $request, Customer $customer): Response
    {
        $user = $request->user();
        $customer = $this->findScopedCustomer($request, $customer->id);

        $branches = $this->getSelectableBranches($request);
        $packages = $this->getSelectablePackages($request);
        $userBranchIds = $user?->branches()->pluck('branches.id')->all() ?? [];

        return Inertia::render('Customers/Form', [
            'mode' => 'edit',
            'customer' => $customer->only([
                'id',
                'customer_code',
                'branch_id',
                'wifi_package_id',
                'name',
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
            'canAssignBranch' => (bool) $user?->hasRole('super_admin'),
            'defaultBranchId' => count($userBranchIds) === 1 ? $userBranchIds[0] : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user?->hasRole('super_admin')) {
            $branchId = (int) $request->input('branch_id');
        } else {
            $userBranchIds = $user?->branches()->pluck('branches.id')->all() ?? [];
            if (count($userBranchIds) === 1) {
                // Implicitly assign the only branch the user has access to
                $branchId = $userBranchIds[0];
            } else {
                // User has 0 or multiple branches — require explicit selection (or error)
                $branchId = (int) $request->input('branch_id');
            }
        }

        if ($branchId <= 0) {
            abort(422, 'Branch is required.');
        }

        $request->merge([
            'branch_id' => $branchId,
            'created_by_user_id' => $user?->id,
        ]);

        $data = $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'wifi_package_id' => ['nullable', 'integer', 'exists:wifi_packages,id'],
            'name' => ['required', 'string', 'max:255'],
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

        Customer::create($data);

        return redirect()->route('admin.customers.index');
    }

    public function update(Request $request, Customer $customer): RedirectResponse
    {
        $user = $request->user();
        $customer = $this->findScopedCustomer($request, $customer->id);

        $branchId = $user?->hasRole('super_admin') ? (int) $request->input('branch_id') : (int) $customer->branch_id;
        if ($branchId <= 0) {
            abort(422, 'Branch is required.');
        }

        $request->merge(['branch_id' => $branchId]);

        $data = $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'wifi_package_id' => ['nullable', 'integer', 'exists:wifi_packages,id'],
            'name' => ['required', 'string', 'max:255'],
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
        $userBranchIds = $user?->branches()->pluck('branches.id')->all() ?? [];

        return Customer::query()
            ->when(
                !$this->canViewAllBranches($request) && !empty($userBranchIds),
                fn ($query) => $query->whereIn('branch_id', $userBranchIds)
            )
            ->findOrFail($customerId);
    }
}
