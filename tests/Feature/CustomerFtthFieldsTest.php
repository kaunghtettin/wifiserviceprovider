<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
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
}
