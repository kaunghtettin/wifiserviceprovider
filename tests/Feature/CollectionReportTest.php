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
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->get(route('admin.reports.index', ['month' => '2026-06']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.as_of_date', '2026-06-07')
                ->where('summary.overdue_count', 1)
                ->where('summary.overdue_amount', 5000)
                ->missing('overdueCustomers')
                ->missing('overdueAging')
            );
    }

    public function test_report_builds_yearly_daily_and_expense_analytics_for_the_active_branch(): void
    {
        [$user, $branch] = $this->createReportUser();
        $customer = $this->createCustomer($branch, 'Analytics Customer');
        $januaryInvoice = $this->createInvoice($customer, '2026-01-01', '2026-01-07', 10000);
        $juneInvoice = $this->createInvoice($customer, '2026-06-01', '2026-06-28', 30000);

        Payment::create([
            'branch_id' => $branch->id,
            'invoice_id' => $januaryInvoice->id,
            'customer_id' => $customer->id,
            'amount' => 10000,
            'paid_at' => '2026-01-05 10:00:00',
            'method' => 'cash',
        ]);
        Payment::create([
            'branch_id' => $branch->id,
            'invoice_id' => $juneInvoice->id,
            'customer_id' => $customer->id,
            'amount' => 12000,
            'paid_at' => '2026-06-02 10:00:00',
            'method' => 'cash',
        ]);
        Payment::create([
            'branch_id' => $branch->id,
            'invoice_id' => $juneInvoice->id,
            'customer_id' => $customer->id,
            'amount' => 8000,
            'paid_at' => '2026-06-07 10:00:00',
            'method' => 'cash',
        ]);

        Expense::create([
            'branch_id' => $branch->id,
            'category' => 'office',
            'title' => 'January office',
            'amount' => 2000,
            'expense_date' => '2026-01-10',
        ]);
        Expense::create([
            'branch_id' => $branch->id,
            'category' => 'network',
            'title' => 'June network',
            'amount' => 5000,
            'expense_date' => '2026-06-05',
        ]);
        Expense::create([
            'branch_id' => $branch->id,
            'category' => 'office',
            'title' => 'Old office',
            'amount' => 1000,
            'expense_date' => '2025-12-10',
        ]);

        $otherBranch = Branch::create(['name' => 'Mandalay', 'code' => 'MDY']);
        Expense::create([
            'branch_id' => $otherBranch->id,
            'category' => 'network',
            'title' => 'Hidden expense',
            'amount' => 99000,
            'expense_date' => '2026-06-05',
        ]);

        $this->actingAs($user)
            ->withSession(['workspace' => 'branch', 'active_branch_id' => $branch->id])
            ->get(route('admin.reports.index', [
                'month' => '2026-06',
                'period_start' => '2026-06-01',
                'period_end' => '2026-06-15',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.period_start', '2026-06-01')
                ->where('filters.period_end', '2026-06-15')
                ->has('yearlyTrend', 12)
                ->where('yearlyTrend.0.sales', 10000)
                ->where('yearlyTrend.0.expenses', 2000)
                ->where('yearlyTrend.0.net_profit', 8000)
                ->where('yearlyTrend.5.sales', 20000)
                ->where('yearlyTrend.5.expenses', 5000)
                ->where('yearlyTrend.5.net_profit', 15000)
                ->where('dailySales.1.sales', 12000)
                ->where('dailySales.6.sales', 8000)
                ->where('expenseAnalysis.selected_period_total', 5000)
                ->where('expenseAnalysis.all_time_total', 8000)
                ->where('expenseAnalysis.selected_period.0.category', 'network')
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
            'scope' => 'branch',
            'description' => 'Report staff',
        ]);
        $role->permissions()->sync($permissions->pluck('id'));

        $branch = Branch::create(['name' => 'Yangon', 'code' => 'YGN']);
        $user = User::factory()->create([
            'role_id' => $role->id,
            'status' => 'active',
        ]);
        $user->branches()->sync([
            $branch->id => ['role_id' => $role->id],
        ]);

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
