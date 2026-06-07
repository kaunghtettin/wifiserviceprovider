<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\WifiPackage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WorkspaceFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        URL::forceRootUrl('http://localhost');
    }

    protected function tearDown(): void
    {
        URL::forceRootUrl(null);
        parent::tearDown();
    }

    public function test_user_must_select_a_workspace_before_opening_operations(): void
    {
        [$user] = $this->branchUser(['dashboard.view']);

        $this->actingAs($user)
            ->get(route('admin.dashboard'))
            ->assertRedirect(route('admin.workspaces.index'));
    }

    public function test_selector_shows_each_branch_with_its_assigned_role(): void
    {
        [$user, $firstBranch, $firstRole] = $this->branchUser(['dashboard.view'], 'manager');
        $secondBranch = Branch::create(['name' => 'Mandalay', 'code' => 'MDY']);
        $secondRole = $this->role('customer_service', ['customers.manage']);
        $user->branches()->attach($secondBranch->id, ['role_id' => $secondRole->id]);

        $this->actingAs($user)
            ->get(route('admin.workspaces.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Workspaces/Select')
                ->has('branches', 2)
                ->where('branches.0.id', $secondBranch->id)
                ->where('branches.0.role', $secondRole->name)
                ->where('branches.1.id', $firstBranch->id)
                ->where('branches.1.role', $firstRole->name)
            );
    }

    public function test_active_branch_is_the_only_operational_data_scope(): void
    {
        [$user, $firstBranch] = $this->branchUser(['dashboard.view', 'customers.manage']);
        $secondBranch = Branch::create(['name' => 'Mandalay', 'code' => 'MDY']);
        $role = Role::query()->where('name', 'manager')->firstOrFail();
        $user->branches()->attach($secondBranch->id, ['role_id' => $role->id]);

        $this->customer($firstBranch, 'Visible Customer');
        $this->customer($secondBranch, 'Hidden Customer');

        $this->actingAs($user)
            ->post(route('admin.workspaces.branches.select', $firstBranch))
            ->assertRedirect(route('admin.dashboard'));

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $firstBranch->id])
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.branch.id', $firstBranch->id)
                ->where('dashboard.cards.0.value', 1)
                ->has('dashboard.recent_customers', 1)
            );
    }

    public function test_permissions_change_when_the_user_switches_branches(): void
    {
        [$user, $managerBranch] = $this->branchUser(['dashboard.view', 'customers.manage'], 'manager');
        $staffBranch = Branch::create(['name' => 'Mandalay', 'code' => 'MDY']);
        $staffRole = $this->role('staff_only', ['dashboard.view']);
        $user->branches()->attach($staffBranch->id, ['role_id' => $staffRole->id]);

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $managerBranch->id])
            ->get(route('admin.customers.index'))
            ->assertOk();

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $staffBranch->id])
            ->get(route('admin.customers.index'))
            ->assertForbidden();
    }

    public function test_global_and_branch_workspaces_are_separate(): void
    {
        $globalRole = $this->role('global_admin', ['branches.manage', 'reports.global'], 'global');
        $branchRole = $this->role('branch_manager', ['dashboard.view']);
        $branch = Branch::create(['name' => 'Yangon', 'code' => 'YGN']);
        $user = User::factory()->create(['role_id' => $globalRole->id, 'status' => 'active']);
        $user->branches()->attach($branch->id, ['role_id' => $branchRole->id]);

        $this->actingAs($user)
            ->withSession(['workspace' => 'global'])
            ->get(route('admin.branches.index'))
            ->assertOk();

        $this->actingAs($user)
            ->withSession(['workspace' => 'global'])
            ->get(route('admin.dashboard'))
            ->assertRedirect(route('admin.workspaces.index'));
    }

    public function test_performance_is_available_only_as_the_global_summary(): void
    {
        $this->assertFalse(Route::has('admin.performance.index'));
        $this->assertTrue(Route::has('admin.global-summary.index'));
    }

    public function test_invoice_summary_counts_statuses_for_only_the_selected_branch_and_month(): void
    {
        [$user, $branch] = $this->branchUser(['invoices.manage']);
        $otherBranch = Branch::create(['name' => 'Mandalay', 'code' => 'MDY']);

        foreach (['paid', 'partial', 'unpaid', 'overdue', 'paid'] as $index => $status) {
            $this->invoice($this->customer($branch, 'Visible Customer '.$index), $status, '2026-06-01');
        }

        $this->invoice($this->customer($branch, 'Other Month'), 'overdue', '2026-05-01');
        $this->invoice($this->customer($otherBranch, 'Other Branch'), 'overdue', '2026-06-01');

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->get(route('admin.invoices.index', ['month' => '2026-06']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('summary.month', '2026-06')
                ->where('summary.total_count', 5)
                ->where('summary.overdue_count', 1)
                ->where('summary.paid_count', 2)
                ->where('summary.partial_count', 1)
                ->where('summary.unpaid_count', 1)
            );
    }

    private function branchUser(array $permissions, string $roleName = 'manager'): array
    {
        $role = $this->role($roleName, $permissions);
        $branch = Branch::create(['name' => 'Yangon', 'code' => 'YGN']);
        $user = User::factory()->create(['role_id' => null, 'status' => 'active']);
        $user->branches()->attach($branch->id, ['role_id' => $role->id]);

        return [$user, $branch, $role];
    }

    private function role(string $name, array $permissionKeys, string $scope = 'branch'): Role
    {
        $role = Role::create(['name' => $name, 'scope' => $scope]);
        $permissions = collect($permissionKeys)->map(fn (string $key) => Permission::firstOrCreate(['key' => $key]));
        $role->permissions()->sync($permissions->pluck('id'));

        return $role;
    }

    private function customer(Branch $branch, string $name): Customer
    {
        $package = WifiPackage::create([
            'branch_id' => $branch->id,
            'name' => $branch->code.' Plan',
            'speed_mbps' => 20,
            'price' => 35000,
            'duration_months' => 1,
            'status' => 'active',
        ]);

        return Customer::create([
            'branch_id' => $branch->id,
            'wifi_package_id' => $package->id,
            'name' => $name,
            'phone' => '09'.str_pad((string) $branch->id, 8, '0', STR_PAD_LEFT),
            'billing_day_of_month' => 7,
            'status' => 'active',
        ]);
    }

    private function invoice(Customer $customer, string $status, string $month): Invoice
    {
        $totalAmount = 35000;
        $paidAmount = match ($status) {
            'paid' => $totalAmount,
            'partial' => 15000,
            default => 0,
        };

        return Invoice::create([
            'branch_id' => $customer->branch_id,
            'customer_id' => $customer->id,
            'wifi_package_id' => $customer->wifi_package_id,
            'invoice_month' => $month,
            'due_date' => $status === 'overdue' ? '2026-06-01' : '2026-06-28',
            'billing_day_of_month' => 7,
            'package_name' => $customer->package->name,
            'package_price' => $totalAmount,
            'total_amount' => $totalAmount,
            'paid_amount' => $paidAmount,
            'balance_amount' => $totalAmount - $paidAmount,
            'status' => $status,
        ]);
    }
}
