<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\WifiPackage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BranchAccessTest extends TestCase
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

    public function test_dashboard_uses_all_assigned_branches_and_excludes_unassigned_branches(): void
    {
        [$user, $assignedBranches, $otherBranch] = $this->createBranchUser(['dashboard.view', 'customers.manage']);

        foreach ($assignedBranches as $index => $branch) {
            $customer = $this->createCustomer($branch, 'Assigned Customer '.$index);
            $this->createInvoice($customer);
        }

        $hiddenCustomer = $this->createCustomer($otherBranch, 'Hidden Customer');
        $this->createInvoice($hiddenCustomer);

        $this->actingAs($user)
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('dashboard.scope_label', '2 assigned branches')
                ->where('dashboard.cards.0.key', 'customers')
                ->where('dashboard.cards.0.value', 2)
                ->where('dashboard.cards.1.key', 'outstanding')
                ->where('dashboard.cards.1.value', 70000)
                ->has('dashboard.recent_customers', 2)
            );
    }

    public function test_monthly_invoice_generation_is_limited_to_assigned_branches(): void
    {
        [$user, $assignedBranches, $otherBranch] = $this->createBranchUser(['invoices.manage']);

        foreach ($assignedBranches as $index => $branch) {
            $this->createCustomer($branch, 'Assigned Customer '.$index);
        }

        $hiddenCustomer = $this->createCustomer($otherBranch, 'Hidden Customer');

        $this->actingAs($user)
            ->post(route('admin.invoices.store'), ['month' => '2026-06'])
            ->assertRedirect(route('admin.invoices.index', ['month' => '2026-06']));

        $this->assertDatabaseCount('invoices', 2);
        $this->assertDatabaseMissing('invoices', [
            'customer_id' => $hiddenCustomer->id,
            'invoice_month' => '2026-06-01',
        ]);
    }

    public function test_user_cannot_record_payment_for_an_unassigned_branch(): void
    {
        [$user, , $otherBranch] = $this->createBranchUser(['payments.manage']);
        $customer = $this->createCustomer($otherBranch, 'Hidden Customer');
        $invoice = $this->createInvoice($customer);

        $this->actingAs($user)
            ->post(route('admin.payments.store'), [
                'invoice_id' => $invoice->id,
                'amount' => 1000,
                'paid_at' => '2026-06-07',
                'method' => 'cash',
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('payments', 0);
    }

    public function test_user_without_branch_assignments_sees_no_branch_data(): void
    {
        [$user, , $otherBranch] = $this->createBranchUser(['dashboard.view', 'customers.manage'], false);
        $this->createCustomer($otherBranch, 'Hidden Customer');

        $this->actingAs($user)
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('dashboard.scope_label', '0 assigned branches')
                ->where('dashboard.cards.0.value', 0)
                ->has('dashboard.recent_customers', 0)
                ->where('auth.branch_ids', [])
            );
    }

    public function test_dashboard_shortcuts_follow_the_users_permissions(): void
    {
        [$user] = $this->createBranchUser(['customers.manage']);

        $this->actingAs($user)
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('dashboard.shortcuts', fn ($shortcuts) => $shortcuts
                    ->pluck('label')
                    ->values()
                    ->all() === ['Add customer', 'Find customer'])
                ->where('dashboard.cards', fn ($cards) => $cards
                    ->pluck('key')
                    ->values()
                    ->all() === ['customers', 'outstanding'])
                ->has('dashboard.recent_payments', 0)
            );
    }

    public function test_reports_and_performance_include_only_assigned_branches(): void
    {
        [$user, $assignedBranches, $otherBranch] = $this->createBranchUser(['dashboard.view']);

        foreach ($assignedBranches as $index => $branch) {
            $customer = $this->createCustomer($branch, 'Assigned Customer '.$index);
            $invoice = $this->createInvoice($customer, 10000 + ($index * 5000));

            Payment::create([
                'branch_id' => $branch->id,
                'invoice_id' => $invoice->id,
                'customer_id' => $customer->id,
                'amount' => 5000,
                'paid_at' => '2026-06-07 10:00:00',
                'method' => 'cash',
            ]);

            Expense::create([
                'branch_id' => $branch->id,
                'category' => 'office',
                'title' => 'Assigned expense',
                'amount' => 1000,
                'expense_date' => '2026-06-07',
            ]);
        }

        $hiddenCustomer = $this->createCustomer($otherBranch, 'Hidden Customer');
        $hiddenInvoice = $this->createInvoice($hiddenCustomer, 90000);
        Payment::create([
            'branch_id' => $otherBranch->id,
            'invoice_id' => $hiddenInvoice->id,
            'customer_id' => $hiddenCustomer->id,
            'amount' => 70000,
            'paid_at' => '2026-06-07 10:00:00',
            'method' => 'cash',
        ]);
        Expense::create([
            'branch_id' => $otherBranch->id,
            'category' => 'office',
            'title' => 'Hidden expense',
            'amount' => 40000,
            'expense_date' => '2026-06-07',
        ]);

        $this->actingAs($user)
            ->get(route('admin.reports.index', ['month' => '2026-06']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('summary.billed_amount', 25000)
                ->where('summary.collected_amount', 10000)
            );

        $this->actingAs($user)
            ->get(route('admin.performance.index', ['month' => '2026-06']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('summary.income_total', 10000)
                ->where('summary.expense_total', 2000)
                ->where('branchPerformance', fn ($branches) => count($branches) === 2)
            );
    }

    /**
     * @param  array<int, string>  $permissionKeys
     * @return array{User, array<int, Branch>, Branch}
     */
    private function createBranchUser(array $permissionKeys, bool $attachBranches = true): array
    {
        $role = Role::create([
            'name' => 'branch_admin',
            'description' => 'Branch-scoped test role',
        ]);

        $permissions = collect($permissionKeys)->map(function (string $key) {
            return Permission::create([
                'key' => $key,
                'description' => $key,
            ]);
        });
        $role->permissions()->sync($permissions->pluck('id'));

        $assignedBranches = [
            Branch::create(['name' => 'Yangon', 'code' => 'YGN']),
            Branch::create(['name' => 'Mandalay', 'code' => 'MDY']),
        ];
        $otherBranch = Branch::create(['name' => 'Taunggyi', 'code' => 'TGI']);

        $user = User::factory()->create([
            'role_id' => $role->id,
            'status' => 'active',
        ]);

        if ($attachBranches) {
            $user->branches()->sync(collect($assignedBranches)->pluck('id'));
        }

        return [$user->fresh(), $assignedBranches, $otherBranch];
    }

    private function createCustomer(Branch $branch, string $name): Customer
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

    private function createInvoice(Customer $customer, float $totalAmount = 35000): Invoice
    {
        return Invoice::create([
            'branch_id' => $customer->branch_id,
            'customer_id' => $customer->id,
            'wifi_package_id' => $customer->wifi_package_id,
            'invoice_month' => '2026-06-01',
            'due_date' => '2026-06-07',
            'billing_day_of_month' => 7,
            'package_name' => $customer->package->name,
            'package_price' => $totalAmount,
            'total_amount' => $totalAmount,
            'paid_amount' => 0,
            'balance_amount' => $totalAmount,
            'status' => 'unpaid',
        ]);
    }
}
