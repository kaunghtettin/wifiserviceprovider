<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Customer;
use App\Services\Billing\ContinuousOverdueTracker;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OverdueTrackingController extends Controller
{
    private const CUSTOMER_STATUSES = ['active', 'pending', 'suspended', 'disconnected'];

    public function __construct(private ContinuousOverdueTracker $tracker)
    {
    }

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('q', ''));
        $minimumMonths = max(1, min((int) $request->query('minimum_months', 1), 3));
        $asOfDate = now()->startOfDay();

        $customers = Customer::query()
            ->with('package:id,name,speed_mbps')
            ->where('status', 'active')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($builder) use ($search) {
                    $builder->where('name', 'like', '%'.$search.'%')
                        ->orWhere('customer_code', 'like', '%'.$search.'%')
                        ->orWhere('phone', 'like', '%'.$search.'%');
                });
            })
            ->get([
                'id',
                'customer_code',
                'wifi_package_id',
                'name',
                'phone',
                'status',
            ])
            ->keyBy('id');

        $tracking = $this->tracker
            ->track($asOfDate, $customers->keys()->map(fn ($id) => (int) $id)->all())
            ->filter(fn (array $row) => $row['consecutive_months'] >= $minimumMonths)
            ->map(function (array $row) use ($customers) {
                $customer = $customers->get($row['customer_id']);

                return array_merge($row, [
                    'eligible_for_suspension' => $row['consecutive_months'] >= 3,
                    'customer' => $customer ? [
                        'id' => $customer->id,
                        'customer_code' => $customer->customer_code,
                        'name' => $customer->name,
                        'phone' => $customer->phone,
                        'status' => $customer->status,
                        'package' => $customer->package ? [
                            'name' => $customer->package->name,
                            'speed_mbps' => $customer->package->speed_mbps,
                        ] : null,
                    ] : null,
                ]);
            })
            ->filter(fn (array $row) => $row['customer'] !== null)
            ->sortByDesc(fn (array $row) => [$row['consecutive_months'], $row['outstanding_balance']])
            ->values();

        return Inertia::render('OverdueTracking/Index', [
            'tracking' => $tracking,
            'filters' => [
                'q' => $search,
                'minimum_months' => $minimumMonths,
            ],
            'asOfDate' => $asOfDate->toDateString(),
            'statusOptions' => self::CUSTOMER_STATUSES,
            'summary' => [
                'total_customers' => $tracking->count(),
                'one_month' => $tracking->where('consecutive_months', 1)->count(),
                'two_months' => $tracking->where('consecutive_months', 2)->count(),
                'three_plus_months' => $tracking->where('consecutive_months', '>=', 3)->count(),
                'outstanding_balance' => round((float) $tracking->sum('outstanding_balance'), 2),
            ],
        ]);
    }

    public function updateStatus(Request $request, Customer $customer): RedirectResponse
    {
        $customer = Customer::query()
            ->where('status', 'active')
            ->findOrFail($customer->id);
        $data = $request->validate([
            'status' => ['required', Rule::in(self::CUSTOMER_STATUSES)],
        ]);

        $previousStatus = $customer->status;
        if ($previousStatus === $data['status']) {
            return back()->with('warning', 'Customer already has this status.');
        }

        $customer->update(['status' => $data['status']]);

        ActivityLog::create([
            'branch_id' => $customer->branch_id,
            'actor_user_id' => $request->user()?->id,
            'entity_type' => 'customer',
            'entity_id' => $customer->id,
            'action' => 'update_customer_status_from_overdue_tracking',
            'metadata' => [
                'previous_status' => $previousStatus,
                'new_status' => $data['status'],
            ],
            'created_at' => now(),
        ]);

        return back()->with('success', 'Customer status updated.');
    }

    public function bulkUpdateStatus(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'customer_ids' => ['required', 'array', 'min:1', 'max:500'],
            'customer_ids.*' => ['integer', 'distinct'],
            'status' => ['required', Rule::in(self::CUSTOMER_STATUSES)],
        ]);

        $requestedCustomerIds = collect($data['customer_ids'])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $customers = Customer::query()
            ->where('status', 'active')
            ->whereIn('id', $requestedCustomerIds)
            ->get(['id', 'branch_id', 'status']);

        if ($customers->isEmpty()) {
            return back()->with('warning', 'No active overdue customers were selected.');
        }

        $trackedCustomerIds = $this->tracker
            ->track(now()->startOfDay(), $customers->pluck('id')->all())
            ->pluck('customer_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $customers = $customers
            ->whereIn('id', $trackedCustomerIds)
            ->values();

        if ($customers->isEmpty()) {
            return back()->with('warning', 'Selected customers are no longer in overdue tracking.');
        }

        if ($data['status'] === 'active') {
            return back()->with('warning', 'Selected customers are already active.');
        }

        foreach ($customers as $customer) {
            $previousStatus = $customer->status;
            $customer->update(['status' => $data['status']]);

            ActivityLog::create([
                'branch_id' => $customer->branch_id,
                'actor_user_id' => $request->user()?->id,
                'entity_type' => 'customer',
                'entity_id' => $customer->id,
                'action' => 'bulk_update_customer_status_from_overdue_tracking',
                'metadata' => [
                    'previous_status' => $previousStatus,
                    'new_status' => $data['status'],
                    'requested_customer_ids' => $requestedCustomerIds->all(),
                ],
                'created_at' => now(),
            ]);
        }

        return back()->with('success', $customers->count().' customer status(es) updated.');
    }

    public function suspend(Request $request, Customer $customer): RedirectResponse
    {
        $customer = Customer::query()->findOrFail($customer->id);
        $tracking = $this->tracker->forCustomer($customer, now()->startOfDay());

        if ($tracking['consecutive_months'] < 3) {
            return back()->with('error', 'This customer has fewer than three consecutive overdue months.');
        }

        if ($customer->status === 'suspended') {
            return back()->with('warning', 'This customer is already suspended.');
        }

        $previousStatus = $customer->status;
        $customer->update(['status' => 'suspended']);

        ActivityLog::create([
            'branch_id' => $customer->branch_id,
            'actor_user_id' => $request->user()?->id,
            'entity_type' => 'customer',
            'entity_id' => $customer->id,
            'action' => 'suspend_customer_for_continuous_overdue',
            'metadata' => [
                'previous_status' => $previousStatus,
                'consecutive_months' => $tracking['consecutive_months'],
                'outstanding_balance' => $tracking['outstanding_balance'],
                'invoice_ids' => $tracking['invoice_ids'],
            ],
            'created_at' => now(),
        ]);

        return back()->with('success', 'Customer suspended after three consecutive overdue months.');
    }
}
