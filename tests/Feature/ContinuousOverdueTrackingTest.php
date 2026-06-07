<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\WifiPackage;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ContinuousOverdueTrackingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        URL::forceRootUrl('http://localhost');
        Carbon::setTestNow('2026-09-15 10:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        URL::forceRootUrl(null);

        parent::tearDown();
    }

    public function test_tracker_counts_only_consecutive_overdue_invoice_months_in_the_active_branch(): void
    {
        [$user, $branch] = $this->createCustomerManager();

        $threeMonthCustomer = $this->customer($branch, 'Three Month Customer');
        $this->invoice($threeMonthCustomer, '2026-06-01', 35000);
        $this->invoice($threeMonthCustomer, '2026-07-01', 35000);
        $this->invoice($threeMonthCustomer, '2026-08-01', 35000);

        $paidResetCustomer = $this->customer($branch, 'Paid Reset Customer');
        $this->invoice($paidResetCustomer, '2026-06-01', 35000);
        $this->invoice($paidResetCustomer, '2026-07-01', 0, 'paid');
        $this->invoice($paidResetCustomer, '2026-08-01', 35000);

        $missingMonthCustomer = $this->customer($branch, 'Missing Month Customer');
        $this->invoice($missingMonthCustomer, '2026-06-01', 35000);
        $this->invoice($missingMonthCustomer, '2026-08-01', 35000);

        $otherBranch = Branch::create(['name' => 'Mandalay', 'code' => 'MDY']);
        $hiddenCustomer = $this->customer($otherBranch, 'Hidden Customer');
        $this->invoice($hiddenCustomer, '2026-06-01', 35000);
        $this->invoice($hiddenCustomer, '2026-07-01', 35000);
        $this->invoice($hiddenCustomer, '2026-08-01', 35000);

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->get(route('admin.overdue-tracking.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('OverdueTracking/Index')
                ->where('summary.total_customers', 3)
                ->where('summary.one_month', 2)
                ->where('summary.two_months', 0)
                ->where('summary.three_plus_months', 1)
                ->where('tracking', fn ($rows) => $rows
                    ->mapWithKeys(fn ($row) => [$row['customer']['name'] => $row['consecutive_months']])
                    ->all() === [
                        'Three Month Customer' => 3,
                        'Paid Reset Customer' => 1,
                        'Missing Month Customer' => 1,
                    ])
            );
    }

    public function test_paid_month_removes_customer_from_continuous_overdue_tracking(): void
    {
        Carbon::setTestNow('2026-03-15 10:00:00');

        [$user, $branch] = $this->createCustomerManager();
        $customer = $this->customer($branch, 'January Overdue Customer');
        $this->invoice($customer, '2026-01-01', 35000);
        $this->invoice($customer, '2026-02-01', 0, 'paid');

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->get(route('admin.overdue-tracking.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('OverdueTracking/Index')
                ->where('summary.total_customers', 0)
                ->has('tracking', 0)
            );
    }

    public function test_paid_invoice_due_today_resets_previous_continuous_overdue_months(): void
    {
        Carbon::setTestNow('2026-06-07 22:43:00');

        [$user, $branch] = $this->createCustomerManager();
        $customer = $this->customer($branch, 'June Paid Customer');
        $this->invoice($customer, '2026-04-01', 23400);
        $this->invoice($customer, '2026-05-01', 52000);
        $this->invoice($customer, '2026-06-01', 0, 'paid');

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->get(route('admin.overdue-tracking.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('OverdueTracking/Index')
                ->where('summary.total_customers', 0)
                ->has('tracking', 0)
            );
    }

    public function test_paid_current_month_invoice_resets_previous_overdues_even_before_due_date(): void
    {
        Carbon::setTestNow('2026-06-07 22:51:00');

        [$user, $branch] = $this->createCustomerManager();
        $customer = $this->customer($branch, 'Future Due Paid Customer', 10);
        $this->invoice($customer, '2026-04-01', 12600);
        $this->invoice($customer, '2026-05-01', 28000);
        $this->invoice($customer, '2026-06-01', 0, 'paid');

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->get(route('admin.overdue-tracking.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('OverdueTracking/Index')
                ->where('summary.total_customers', 0)
                ->has('tracking', 0)
            );
    }

    public function test_overdue_tracking_only_lists_active_customers(): void
    {
        [$user, $branch] = $this->createCustomerManager();

        $activeCustomer = $this->customer($branch, 'Active Overdue Customer');
        $this->invoice($activeCustomer, '2026-07-01', 35000);
        $this->invoice($activeCustomer, '2026-08-01', 35000);

        $suspendedCustomer = $this->customer($branch, 'Suspended Overdue Customer');
        $suspendedCustomer->update(['status' => 'suspended']);
        $this->invoice($suspendedCustomer, '2026-07-01', 35000);
        $this->invoice($suspendedCustomer, '2026-08-01', 35000);

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->get(route('admin.overdue-tracking.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('OverdueTracking/Index')
                ->where('summary.total_customers', 1)
                ->where('tracking', fn ($rows) => $rows
                    ->map(fn ($row) => $row['customer']['name'])
                    ->all() === ['Active Overdue Customer'])
            );
    }

    public function test_three_month_customer_can_be_suspended_and_the_action_is_logged(): void
    {
        [$user, $branch] = $this->createCustomerManager();
        $customer = $this->customer($branch, 'Suspend Customer');
        $this->invoice($customer, '2026-06-01', 35000);
        $this->invoice($customer, '2026-07-01', 35000);
        $this->invoice($customer, '2026-08-01', 35000);

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->post(route('admin.overdue-tracking.suspend', $customer))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'status' => 'suspended',
        ]);
        $this->assertDatabaseHas('activity_logs', [
            'branch_id' => $branch->id,
            'actor_user_id' => $user->id,
            'entity_type' => 'customer',
            'entity_id' => $customer->id,
            'action' => 'suspend_customer_for_continuous_overdue',
        ]);

        $log = ActivityLog::query()->where('action', 'suspend_customer_for_continuous_overdue')->firstOrFail();
        $this->assertSame(3, $log->metadata['consecutive_months']);
    }

    public function test_customer_status_can_be_changed_from_overdue_tracking(): void
    {
        [$user, $branch] = $this->createCustomerManager();
        $customer = $this->customer($branch, 'Status Change Customer');
        $this->invoice($customer, '2026-06-01', 35000);
        $this->invoice($customer, '2026-07-01', 35000);

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->post(route('admin.overdue-tracking.status', $customer), [
                'status' => 'disconnected',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'status' => 'disconnected',
        ]);
        $this->assertDatabaseHas('activity_logs', [
            'branch_id' => $branch->id,
            'actor_user_id' => $user->id,
            'entity_type' => 'customer',
            'entity_id' => $customer->id,
            'action' => 'update_customer_status_from_overdue_tracking',
        ]);

        $log = ActivityLog::query()->where('action', 'update_customer_status_from_overdue_tracking')->firstOrFail();
        $this->assertSame('active', $log->metadata['previous_status']);
        $this->assertSame('disconnected', $log->metadata['new_status']);
    }

    public function test_bulk_customer_status_change_updates_only_active_tracked_customers(): void
    {
        [$user, $branch] = $this->createCustomerManager();

        $firstTracked = $this->customer($branch, 'First Bulk Customer');
        $this->invoice($firstTracked, '2026-07-01', 35000);
        $this->invoice($firstTracked, '2026-08-01', 35000);

        $secondTracked = $this->customer($branch, 'Second Bulk Customer');
        $this->invoice($secondTracked, '2026-07-01', 35000);
        $this->invoice($secondTracked, '2026-08-01', 35000);

        $notTracked = $this->customer($branch, 'Not Tracked Customer');
        $this->invoice($notTracked, '2026-08-01', 0, 'paid');

        $alreadySuspended = $this->customer($branch, 'Already Suspended Customer');
        $alreadySuspended->update(['status' => 'suspended']);
        $this->invoice($alreadySuspended, '2026-07-01', 35000);
        $this->invoice($alreadySuspended, '2026-08-01', 35000);

        $otherBranch = Branch::create(['name' => 'Mandalay', 'code' => 'MDY']);
        $otherBranchCustomer = $this->customer($otherBranch, 'Other Branch Bulk Customer');
        $this->invoice($otherBranchCustomer, '2026-07-01', 35000);
        $this->invoice($otherBranchCustomer, '2026-08-01', 35000);

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->post(route('admin.overdue-tracking.status.bulk'), [
                'customer_ids' => [
                    $firstTracked->id,
                    $secondTracked->id,
                    $notTracked->id,
                    $alreadySuspended->id,
                    $otherBranchCustomer->id,
                ],
                'status' => 'disconnected',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('customers', ['id' => $firstTracked->id, 'status' => 'disconnected']);
        $this->assertDatabaseHas('customers', ['id' => $secondTracked->id, 'status' => 'disconnected']);
        $this->assertDatabaseHas('customers', ['id' => $notTracked->id, 'status' => 'active']);
        $this->assertDatabaseHas('customers', ['id' => $alreadySuspended->id, 'status' => 'suspended']);
        $this->assertDatabaseHas('customers', ['id' => $otherBranchCustomer->id, 'status' => 'active']);
        $this->assertSame(2, ActivityLog::query()
            ->where('action', 'bulk_update_customer_status_from_overdue_tracking')
            ->count());
    }

    public function test_customer_with_fewer_than_three_consecutive_months_cannot_be_suspended(): void
    {
        [$user, $branch] = $this->createCustomerManager();
        $customer = $this->customer($branch, 'Two Month Customer');
        $this->invoice($customer, '2026-07-01', 35000);
        $this->invoice($customer, '2026-08-01', 35000);

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->post(route('admin.overdue-tracking.suspend', $customer))
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'status' => 'active',
        ]);
        $this->assertDatabaseMissing('activity_logs', [
            'entity_id' => $customer->id,
            'action' => 'suspend_customer_for_continuous_overdue',
        ]);
    }

    /**
     * @return array{User, Branch}
     */
    private function createCustomerManager(): array
    {
        $permission = Permission::create([
            'key' => 'customers.manage',
            'description' => 'Manage customers',
        ]);
        $role = Role::create([
            'name' => 'customer_manager',
            'scope' => 'branch',
            'description' => 'Customer manager',
        ]);
        $role->permissions()->sync([$permission->id]);

        $branch = Branch::create(['name' => 'Yangon', 'code' => 'YGN']);
        $user = User::factory()->create(['role_id' => null, 'status' => 'active']);
        $user->branches()->attach($branch->id, ['role_id' => $role->id]);

        return [$user, $branch];
    }

    private function customer(Branch $branch, string $name, int $billingDay = 7): Customer
    {
        $package = WifiPackage::create([
            'branch_id' => $branch->id,
            'name' => $name.' Plan',
            'speed_mbps' => 20,
            'price' => 35000,
            'duration_months' => 1,
            'status' => 'active',
        ]);

        return Customer::create([
            'branch_id' => $branch->id,
            'wifi_package_id' => $package->id,
            'name' => $name,
            'phone' => '09'.str_pad((string) $package->id, 8, '0', STR_PAD_LEFT),
            'billing_day_of_month' => $billingDay,
            'status' => 'active',
        ]);
    }

    private function invoice(Customer $customer, string $month, float $balance, string $status = 'overdue'): Invoice
    {
        $total = 35000;

        return Invoice::create([
            'branch_id' => $customer->branch_id,
            'customer_id' => $customer->id,
            'wifi_package_id' => $customer->wifi_package_id,
            'invoice_month' => $month,
            'due_date' => Carbon::parse($month)->day($customer->billing_day_of_month)->toDateString(),
            'billing_day_of_month' => $customer->billing_day_of_month,
            'package_name' => $customer->package->name,
            'package_price' => $total,
            'total_amount' => $total,
            'paid_amount' => $total - $balance,
            'balance_amount' => $balance,
            'status' => $status,
        ]);
    }
}
