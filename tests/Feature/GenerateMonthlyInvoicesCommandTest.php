<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\WifiPackage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GenerateMonthlyInvoicesCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_generates_invoices_for_eligible_customers_without_duplicates(): void
    {
        $branch = Branch::create([
            'name' => 'Main Branch',
            'code' => 'MAIN',
        ]);

        $package = WifiPackage::create([
            'branch_id' => $branch->id,
            'name' => 'Gold 20Mbps',
            'speed_mbps' => 20,
            'price' => 35000,
            'duration_months' => 1,
            'status' => 'active',
        ]);

        Customer::create([
            'branch_id' => $branch->id,
            'wifi_package_id' => $package->id,
            'name' => 'Active Customer',
            'phone' => '091111111',
            'billing_day_of_month' => 5,
            'status' => 'active',
        ]);

        Customer::create([
            'branch_id' => $branch->id,
            'wifi_package_id' => $package->id,
            'name' => 'Suspended Customer',
            'phone' => '092222222',
            'billing_day_of_month' => 10,
            'status' => 'suspended',
        ]);

        Customer::create([
            'branch_id' => $branch->id,
            'wifi_package_id' => $package->id,
            'name' => 'Disconnected Customer',
            'phone' => '093333333',
            'billing_day_of_month' => 15,
            'status' => 'disconnected',
        ]);

        $this->artisan('invoices:generate-monthly', ['month' => '2026-06'])
            ->expectsOutput('Generated 1 invoice(s) for 2026-06.')
            ->assertSuccessful();

        $this->assertDatabaseCount('invoices', 1);
        $this->assertDatabaseMissing('invoices', [
            'customer_id' => Customer::query()->where('name', 'Disconnected Customer')->value('id'),
            'invoice_month' => '2026-06-01',
        ]);
        $this->assertDatabaseMissing('invoices', [
            'customer_id' => Customer::query()->where('name', 'Suspended Customer')->value('id'),
            'invoice_month' => '2026-06-01',
        ]);

        $activeInvoice = Invoice::query()
            ->whereHas('customer', fn ($query) => $query->where('name', 'Active Customer'))
            ->firstOrFail();

        $this->assertSame('2026-06-05', $activeInvoice->due_date->toDateString());
        $this->assertSame('35000.00', $activeInvoice->total_amount);

        $this->artisan('invoices:generate-monthly', ['month' => '2026-06'])
            ->expectsOutput('Generated 0 invoice(s) for 2026-06.')
            ->assertSuccessful();

        $this->assertDatabaseCount('invoices', 1);
        $this->assertSame(2, ActivityLog::query()->where('action', 'generate_monthly_invoices')->count());
    }
}
