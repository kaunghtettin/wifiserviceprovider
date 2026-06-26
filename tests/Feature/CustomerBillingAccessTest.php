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
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CustomerBillingAccessTest extends TestCase
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

    public function test_customer_staff_can_generate_an_invoice_for_an_assigned_customer(): void
    {
        [$user, $branch] = $this->createCustomerStaff();
        $customer = $this->createCustomer($branch, 'New Customer');

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->post(route('admin.customers.invoices.store', $customer), [
                'month' => '2026-06',
            ])
            ->assertRedirect();

        $this->assertTrue(Invoice::query()
            ->where('customer_id', $customer->id)
            ->where('branch_id', $branch->id)
            ->whereDate('invoice_month', '2026-06-01')
            ->where('generated_by_user_id', $user->id)
            ->exists());
    }

    public function test_customer_invoice_generation_does_not_create_a_duplicate_month(): void
    {
        [$user, $branch] = $this->createCustomerStaff();
        $customer = $this->createCustomer($branch, 'New Customer');

        $payload = ['month' => '2026-06'];

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->post(route('admin.customers.invoices.store', $customer), $payload);
        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->post(route('admin.customers.invoices.store', $customer), $payload)
            ->assertSessionHas('warning');

        $this->assertDatabaseCount('invoices', 1);
    }

    public function test_customer_staff_can_generate_combined_invoices_without_duplicating_existing_months(): void
    {
        [$user, $branch] = $this->createCustomerStaff();
        $customer = $this->createCustomer($branch, 'Combined Customer');
        $existingInvoice = $this->createInvoice($customer);

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->post(route('admin.customers.invoices.store', $customer), [
                'start_month' => '2026-06',
                'month_count' => 3,
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseCount('invoices', 3);

        $invoices = Invoice::query()
            ->where('customer_id', $customer->id)
            ->orderBy('invoice_month')
            ->get();

        $this->assertSame(['2026-06-01', '2026-07-01', '2026-08-01'], $invoices->map(
            fn (Invoice $invoice) => $invoice->invoice_month->toDateString()
        )->all());
        $this->assertNotNull($existingInvoice->fresh()->combination_id);
        $this->assertCount(1, $invoices->pluck('combination_id')->unique()->all());
    }

    public function test_combined_invoice_print_uses_group_period_and_summed_amounts(): void
    {
        [$user, $branch] = $this->createCustomerStaff(['customers.manage', 'invoices.manage']);
        $customer = $this->createCustomer($branch, 'Print Combined Customer');

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->post(route('admin.customers.invoices.store', $customer), [
                'start_month' => '2026-06',
                'month_count' => 2,
            ]);

        $invoice = Invoice::query()
            ->where('customer_id', $customer->id)
            ->whereDate('invoice_month', '2026-06-01')
            ->firstOrFail();

        $response = $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->get(route('admin.invoices.print', $invoice));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Invoices/Print')
            ->where('invoice.period_start_month', '2026-06-01')
            ->where('invoice.period_end_month', '2026-07-01')
            ->where('invoice.total_amount', 70000)
            ->where('invoice.paid_amount', 0)
            ->where('invoice.balance_amount', 70000)
            ->where('invoice.combined_invoice_count', 2)
        );
    }

    public function test_customer_index_can_filter_by_billing_day_and_installation_date(): void
    {
        [$user, $branch] = $this->createCustomerStaff();
        $matchedCustomer = $this->createCustomer($branch, 'Matched Customer');
        $matchedCustomer->update([
            'billing_day_of_month' => 15,
            'installation_date' => '2026-06-15',
        ]);

        $this->createCustomer($branch, 'Different Billing Day')->update([
            'billing_day_of_month' => 7,
            'installation_date' => '2026-06-15',
        ]);
        $this->createCustomer($branch, 'Different Install Date')->update([
            'billing_day_of_month' => 15,
            'installation_date' => '2026-06-16',
        ]);

        $response = $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->get(route('admin.customers.index', [
                'billing_day' => 15,
                'installation_date' => '2026-06-15',
            ]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Customers/Index')
            ->where('filters.billing_day', 15)
            ->where('filters.installation_date', '2026-06-15')
            ->has('customers.data', 1)
            ->where('customers.data.0.name', 'Matched Customer')
        );
    }

    public function test_customer_index_can_search_by_ftth_name(): void
    {
        [$user, $branch] = $this->createCustomerStaff();
        $matchedCustomer = $this->createCustomer($branch, 'FTTH Search Customer');
        $matchedCustomer->update(['ftth_account_name' => 'Special FTTH Account']);
        $this->createCustomer($branch, 'Other Customer')->update(['ftth_account_name' => 'Regular Account']);

        $response = $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->get(route('admin.customers.index', ['q' => 'Special FTTH']));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Customers/Index')
            ->where('filters.q', 'Special FTTH')
            ->has('customers.data', 1)
            ->where('customers.data.0.name', 'FTTH Search Customer')
        );
    }

    public function test_customer_staff_cannot_generate_an_invoice_for_an_unassigned_branch(): void
    {
        [$user] = $this->createCustomerStaff();
        $otherBranch = Branch::create(['name' => 'Other Branch', 'code' => 'OTH']);
        $customer = $this->createCustomer($otherBranch, 'Hidden Customer');

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $user->branches()->value('branches.id')])
            ->post(route('admin.customers.invoices.store', $customer), [
                'month' => '2026-06',
            ])
            ->assertNotFound();

        $this->assertDatabaseCount('invoices', 0);
    }

    public function test_customer_staff_can_record_payment_for_the_selected_customer(): void
    {
        [$user, $branch] = $this->createCustomerStaff();
        $customer = $this->createCustomer($branch, 'Paying Customer');
        $invoice = $this->createInvoice($customer);

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->post(route('admin.customers.payments.store', $customer), [
                'invoice_id' => $invoice->id,
                'amount' => 35000,
                'paid_at' => '2026-06-07 10:30:00',
                'method' => 'cash',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('payments', [
            'invoice_id' => $invoice->id,
            'customer_id' => $customer->id,
            'received_by_user_id' => $user->id,
            'amount' => 35000,
        ]);
        $this->assertDatabaseHas('invoices', [
            'id' => $invoice->id,
            'paid_amount' => 35000,
            'balance_amount' => 0,
            'status' => 'paid',
        ]);
    }

    public function test_customer_staff_cannot_apply_another_customers_invoice(): void
    {
        [$user, $branch] = $this->createCustomerStaff();
        $selectedCustomer = $this->createCustomer($branch, 'Selected Customer');
        $otherCustomer = $this->createCustomer($branch, 'Other Customer');
        $otherInvoice = $this->createInvoice($otherCustomer);

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->post(route('admin.customers.payments.store', $selectedCustomer), [
                'invoice_id' => $otherInvoice->id,
                'amount' => 1000,
                'paid_at' => '2026-06-07 10:30:00',
                'method' => 'cash',
            ])
            ->assertNotFound();

        $this->assertDatabaseCount('payments', 0);
    }

    /**
     * @return array{User, Branch}
     */
    private function createCustomerStaff(array $permissionKeys = ['customers.manage']): array
    {
        $permissions = collect($permissionKeys)->map(fn (string $key) => Permission::create([
            'key' => $key,
            'description' => 'Manage '.str_replace('.', ' ', $key),
        ]));
        $role = Role::create([
            'name' => 'customer_staff',
            'description' => 'Customer staff',
        ]);
        $role->permissions()->sync($permissions->pluck('id')->all());

        $branch = Branch::create(['name' => 'Yangon', 'code' => 'YGN']);
        $user = User::factory()->create([
            'role_id' => $role->id,
            'status' => 'active',
        ]);
        $user->branches()->sync([$branch->id => ['role_id' => $role->id]]);

        return [$user->fresh(), $branch];
    }

    private function createCustomer(Branch $branch, string $name): Customer
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
            'billing_day_of_month' => 7,
            'status' => 'active',
        ]);
    }

    private function createInvoice(Customer $customer): Invoice
    {
        return Invoice::create([
            'branch_id' => $customer->branch_id,
            'customer_id' => $customer->id,
            'wifi_package_id' => $customer->wifi_package_id,
            'invoice_month' => '2026-06-01',
            'due_date' => '2026-06-07',
            'billing_day_of_month' => 7,
            'package_name' => $customer->package->name,
            'package_price' => 35000,
            'total_amount' => 35000,
            'paid_amount' => 0,
            'balance_amount' => 35000,
            'status' => 'unpaid',
        ]);
    }
}
