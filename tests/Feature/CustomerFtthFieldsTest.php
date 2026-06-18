<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\WifiPackage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CustomerFtthFieldsTest extends TestCase
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

    public function test_customer_create_and_update_persist_ftth_fields(): void
    {
        [$user, $branch] = $this->customerStaff();

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->post(route('admin.customers.store'), [
                'branch_id' => $branch->id,
                'name' => 'Mya Mya',
                'ftth_account_name' => 'Mya Home Fiber',
                'ftth_id' => 'FTTH-YGN-00042',
                'phone' => '0942000042',
                'billing_day_of_month' => 12,
                'status' => 'active',
            ])
            ->assertRedirect();

        $customer = Customer::query()->where('phone', '0942000042')->firstOrFail();

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'ftth_account_name' => 'Mya Home Fiber',
            'ftth_id' => 'FTTH-YGN-00042',
        ]);

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->put(route('admin.customers.update', $customer), [
                'branch_id' => $branch->id,
                'name' => 'Mya Mya',
                'ftth_account_name' => 'Mya Updated Fiber',
                'ftth_id' => 'FTTH-YGN-00043',
                'phone' => '0942000042',
                'billing_day_of_month' => 12,
                'status' => 'active',
            ])
            ->assertRedirect(route('admin.customers.index'));

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'ftth_account_name' => 'Mya Updated Fiber',
            'ftth_id' => 'FTTH-YGN-00043',
        ]);
    }

    public function test_customer_index_searches_ftth_id_and_address(): void
    {
        [$user, $branch] = $this->customerStaff();
        $package = $this->wifiPackage($branch, 'Fiber 30');

        Customer::create([
            'branch_id' => $branch->id,
            'wifi_package_id' => $package->id,
            'name' => 'Address Match Customer',
            'ftth_id' => 'FTTH-YGN-90001',
            'phone' => '0990000001',
            'address' => 'No. 42 Strand Road, Yangon',
            'billing_day_of_month' => 12,
            'status' => 'active',
        ]);

        Customer::create([
            'branch_id' => $branch->id,
            'wifi_package_id' => $package->id,
            'name' => 'Other Customer',
            'ftth_id' => 'FTTH-YGN-90002',
            'phone' => '0990000002',
            'address' => 'No. 8 Merchant Street, Yangon',
            'billing_day_of_month' => 15,
            'status' => 'active',
        ]);

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->get(route('admin.customers.index', ['q' => '90001']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.q', '90001')
                ->where('customers.total', 1)
                ->where('customers.data.0.name', 'Address Match Customer')
            );

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->get(route('admin.customers.index', ['q' => 'Strand Road']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.q', 'Strand Road')
                ->where('customers.total', 1)
                ->where('customers.data.0.name', 'Address Match Customer')
            );
    }

    public function test_customer_index_filters_by_package(): void
    {
        [$user, $branch] = $this->customerStaff();
        $fiber30 = $this->wifiPackage($branch, 'Fiber 30');
        $fiber50 = $this->wifiPackage($branch, 'Fiber 50');

        Customer::create([
            'branch_id' => $branch->id,
            'wifi_package_id' => $fiber30->id,
            'name' => 'Fiber 30 Customer',
            'phone' => '0990000030',
            'billing_day_of_month' => 12,
            'status' => 'active',
        ]);

        Customer::create([
            'branch_id' => $branch->id,
            'wifi_package_id' => $fiber50->id,
            'name' => 'Fiber 50 Customer',
            'phone' => '0990000050',
            'billing_day_of_month' => 15,
            'status' => 'active',
        ]);

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->get(route('admin.customers.index', ['package_id' => $fiber50->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.package_id', $fiber50->id)
                ->where('customers.total', 1)
                ->where('customers.data.0.name', 'Fiber 50 Customer')
            );
    }

    private function customerStaff(): array
    {
        $permission = Permission::create([
            'key' => 'customers.manage',
            'description' => 'Manage customers',
        ]);
        $role = Role::create([
            'name' => 'customer_staff',
            'description' => 'Customer staff',
        ]);
        $role->permissions()->sync([$permission->id]);

        $branch = Branch::create(['name' => 'Yangon', 'code' => 'YGN']);
        $user = User::factory()->create([
            'role_id' => $role->id,
            'status' => 'active',
        ]);
        $user->branches()->sync([$branch->id => ['role_id' => $role->id]]);

        return [$user->fresh(), $branch];
    }

    private function wifiPackage(Branch $branch, string $name): WifiPackage
    {
        return WifiPackage::create([
            'branch_id' => $branch->id,
            'name' => $name,
            'speed_mbps' => 30,
            'price' => 35000,
            'duration_months' => 1,
            'status' => 'active',
        ]);
    }
}
