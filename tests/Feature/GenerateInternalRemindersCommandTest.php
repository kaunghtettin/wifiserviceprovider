<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Notification;
use App\Models\WifiPackage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GenerateInternalRemindersCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_generates_due_soon_and_overdue_internal_reminders_without_duplicates(): void
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

        $dueSoonCustomer = Customer::create([
            'branch_id' => $branch->id,
            'wifi_package_id' => $package->id,
            'name' => 'Due Soon Customer',
            'phone' => '091111111',
            'billing_day_of_month' => 5,
            'status' => 'active',
        ]);

        $overdueCustomer = Customer::create([
            'branch_id' => $branch->id,
            'wifi_package_id' => $package->id,
            'name' => 'Overdue Customer',
            'phone' => '092222222',
            'billing_day_of_month' => 6,
            'status' => 'active',
        ]);

        $paidCustomer = Customer::create([
            'branch_id' => $branch->id,
            'wifi_package_id' => $package->id,
            'name' => 'Paid Customer',
            'phone' => '093333333',
            'billing_day_of_month' => 7,
            'status' => 'active',
        ]);

        Invoice::create([
            'branch_id' => $branch->id,
            'customer_id' => $dueSoonCustomer->id,
            'wifi_package_id' => $package->id,
            'invoice_month' => '2026-06-01',
            'due_date' => '2026-06-09',
            'billing_day_of_month' => 9,
            'package_name' => $package->name,
            'package_price' => 35000,
            'total_amount' => 35000,
            'paid_amount' => 0,
            'balance_amount' => 35000,
            'status' => 'unpaid',
        ]);

        Invoice::create([
            'branch_id' => $branch->id,
            'customer_id' => $overdueCustomer->id,
            'wifi_package_id' => $package->id,
            'invoice_month' => '2026-06-01',
            'due_date' => '2026-06-05',
            'billing_day_of_month' => 5,
            'package_name' => $package->name,
            'package_price' => 35000,
            'total_amount' => 35000,
            'paid_amount' => 0,
            'balance_amount' => 35000,
            'status' => 'overdue',
        ]);

        Invoice::create([
            'branch_id' => $branch->id,
            'customer_id' => $paidCustomer->id,
            'wifi_package_id' => $package->id,
            'invoice_month' => '2026-06-01',
            'due_date' => '2026-06-05',
            'billing_day_of_month' => 5,
            'package_name' => $package->name,
            'package_price' => 35000,
            'total_amount' => 35000,
            'paid_amount' => 35000,
            'balance_amount' => 0,
            'status' => 'paid',
        ]);

        $this->artisan('reminders:generate-internal', ['--date' => '2026-06-08'])
            ->expectsOutput('Generated 2 reminder(s) for 2026-06-08 (due soon: 1, overdue: 1).')
            ->assertSuccessful();

        $this->assertDatabaseCount('notifications', 2);
        $this->assertDatabaseHas('notifications', [
            'customer_id' => $dueSoonCustomer->id,
            'type' => 'internal',
            'category' => 'invoice_due_soon',
        ]);
        $this->assertDatabaseHas('notifications', [
            'customer_id' => $overdueCustomer->id,
            'type' => 'internal',
            'category' => 'invoice_overdue',
        ]);
        $this->assertDatabaseMissing('notifications', [
            'customer_id' => $paidCustomer->id,
        ]);

        $this->artisan('reminders:generate-internal', ['--date' => '2026-06-08'])
            ->expectsOutput('Generated 0 reminder(s) for 2026-06-08 (due soon: 0, overdue: 0).')
            ->assertSuccessful();

        $this->assertDatabaseCount('notifications', 2);
        $this->assertSame(2, Notification::query()->whereNull('read_at')->count());
        $this->assertSame(2, ActivityLog::query()->where('action', 'generate_internal_reminders')->count());
    }
}
