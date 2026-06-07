<?php

namespace Tests\Feature;

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

class CollectionReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        URL::forceRootUrl('http://localhost');
        Carbon::setTestNow('2026-06-07 10:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        URL::forceRootUrl(null);

        parent::tearDown();
    }

    public function test_collection_report_uses_the_same_current_day_cutoff(): void
    {
        [$user, $branch] = $this->createReportUser();
        $overdueCustomer = $this->createCustomer($branch, 'Overdue Customer');
        $notYetOverdueCustomer = $this->createCustomer($branch, 'Not Yet Overdue');

        $this->createInvoice($overdueCustomer, '2026-06-01', '2026-06-06', 5000);
        $this->createInvoice($notYetOverdueCustomer, '2026-06-01', '2026-06-08', 9000);

        $this->actingAs($user)
            ->get(route('admin.reports.index', ['month' => '2026-06']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.as_of_date', '2026-06-07')
                ->where('summary.overdue_count', 1)
                ->where('summary.overdue_amount', 5000)
                ->has('overdueCustomers', 1)
                ->where('overdueCustomers.0.days_overdue', 1)
            );
    }

    /**
     * @return array{User, Branch}
     */
    private function createReportUser(): array
    {
        $permissions = collect(['dashboard.view', 'customers.manage'])->map(fn (string $key) => Permission::create([
            'key' => $key,
            'description' => $key,
        ]));
        $role = Role::create([
            'name' => 'report_staff',
            'description' => 'Report staff',
        ]);
        $role->permissions()->sync($permissions->pluck('id'));

        $branch = Branch::create(['name' => 'Yangon', 'code' => 'YGN']);
        $user = User::factory()->create([
            'role_id' => $role->id,
            'status' => 'active',
        ]);
        $user->branches()->sync([$branch->id]);

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

    private function createInvoice(Customer $customer, string $invoiceMonth, string $dueDate, float $balance): Invoice
    {
        return Invoice::create([
            'branch_id' => $customer->branch_id,
            'customer_id' => $customer->id,
            'wifi_package_id' => $customer->wifi_package_id,
            'invoice_month' => $invoiceMonth,
            'due_date' => $dueDate,
            'billing_day_of_month' => 7,
            'package_name' => $customer->package->name,
            'package_price' => $balance,
            'total_amount' => $balance,
            'paid_amount' => 0,
            'balance_amount' => $balance,
            'status' => 'unpaid',
        ]);
    }
}
