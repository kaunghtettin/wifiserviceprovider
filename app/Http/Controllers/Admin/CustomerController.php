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
    private function getSelectableBranches(Request $request)
    {
        $user = $request->user();

        if ($user?->hasRole('super_admin')) {
            return Branch::query()->orderBy('name')->get(['id', 'name']);
        }

        return [];
    }

    private function getSelectablePackages(Request $request)
    {
        $user = $request->user();

        $packagesQuery = WifiPackage::query()->orderBy('name');
        if (!$user?->hasRole('super_admin') && !$user?->hasPermission('branches.view_all')) {
            $branchId = $user?->branch_id;
            $packagesQuery->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id');
                if ($branchId) {
                    $q->orWhere('branch_id', $branchId);
                }
            });
        }

        return $packagesQuery->get(['id', 'branch_id', 'name', 'speed_mbps']);
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $search = trim((string) $request->query('q', ''));

        $customersQuery = Customer::query()
            ->with(['branch:id,name', 'package:id,name,speed_mbps,branch_id'])
            ->orderByDesc('id');

        if (!$user?->hasRole('super_admin') && !$user?->hasPermission('branches.view_all')) {
            if ($user?->branch_id) {
                $customersQuery->where('branch_id', $user->branch_id);
            }
        }

        if ($search !== '') {
            $customersQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('phone', 'like', '%'.$search.'%')
                    ->orWhere('customer_code', 'like', '%'.$search.'%');
            });
        }

        $customers = $customersQuery->get([
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
        ]);

        $branches = $this->getSelectableBranches($request);
        $packages = $this->getSelectablePackages($request);

        return Inertia::render('Customers/Index', [
            'customers' => $customers,
            'branches' => $branches,
            'packages' => $packages,
            'canAssignBranch' => (bool) $user?->hasRole('super_admin'),
            'filters' => ['q' => $search],
        ]);
    }

    public function create(Request $request): Response
    {
        $user = $request->user();

        $branches = $this->getSelectableBranches($request);
        $packages = $this->getSelectablePackages($request);

        return Inertia::render('Customers/Form', [
            'mode' => 'create',
            'customer' => null,
            'branches' => $branches,
            'packages' => $packages,
            'canAssignBranch' => (bool) $user?->hasRole('super_admin'),
            'defaultBranchId' => $user?->branch_id,
        ]);
    }

    public function edit(Request $request, Customer $customer): Response
    {
        $user = $request->user();

        if (!$user?->hasRole('super_admin') && $user?->branch_id && (int) $customer->branch_id !== (int) $user->branch_id) {
            abort(403);
        }

        $branches = $this->getSelectableBranches($request);
        $packages = $this->getSelectablePackages($request);

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
            'defaultBranchId' => $user?->branch_id,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $branchId = $user?->hasRole('super_admin')
            ? (int) $request->input('branch_id')
            : (int) ($user?->branch_id ?: 0);

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

        if (!$user?->hasRole('super_admin') && $user?->branch_id && (int) $customer->branch_id !== (int) $user->branch_id) {
            abort(403);
        }

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
        $user = $request->user();

        if (!$user?->hasRole('super_admin') && $user?->branch_id && (int) $customer->branch_id !== (int) $user->branch_id) {
            abort(403);
        }

        $customer->delete();

        return redirect()->route('admin.customers.index');
    }
}
