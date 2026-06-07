<?php

namespace App\Services\Billing;

use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class MonthlyInvoiceGenerator
{
    /**
     * @return array{invoice: Invoice, created: bool}
     */
    public function generateForCustomer(Customer $customer, Carbon $invoiceMonth, ?User $actor = null): array
    {
        $customer->loadMissing('package:id,name,price');
        $normalizedMonth = $invoiceMonth->copy()->startOfMonth();

        $invoice = DB::transaction(
            fn () => $this->createCustomerInvoice($customer, $normalizedMonth, $actor)
        );

        ActivityLog::create([
            'branch_id' => $customer->branch_id,
            'actor_user_id' => $actor?->id,
            'entity_type' => 'invoice',
            'entity_id' => $invoice->id,
            'action' => $invoice->wasRecentlyCreated ? 'generate_customer_invoice' : 'customer_invoice_exists',
            'metadata' => [
                'customer_id' => $customer->id,
                'invoice_month' => $normalizedMonth->toDateString(),
                'created' => $invoice->wasRecentlyCreated,
            ],
            'created_at' => now(),
        ]);

        return [
            'invoice' => $invoice,
            'created' => $invoice->wasRecentlyCreated,
        ];
    }

    /**
     * @param  array<int, string>  $statuses
     * @param  int|array<int, int>|null  $branchScope
     * @return array{invoice_month: string, customer_statuses: array<int, string>, created_count: int}
     */
    public function generate(Carbon $invoiceMonth, array $statuses = [], ?User $actor = null, int|array|null $branchScope = null): array
    {
        $normalizedMonth = $invoiceMonth->copy()->startOfMonth();
        $normalizedStatuses = collect($statuses)
            ->filter(fn ($status) => is_string($status) && $status !== '')
            ->unique()
            ->values()
            ->all();

        if (empty($normalizedStatuses)) {
            $normalizedStatuses = ['active'];
        }

        $customersQuery = Customer::query()->with('package:id,name,price');

        $branchIds = $branchScope === null
            ? null
            : collect(is_array($branchScope) ? $branchScope : [$branchScope])
                ->map(fn ($branchId) => (int) $branchId)
                ->filter(fn ($branchId) => $branchId > 0)
                ->unique()
                ->values()
                ->all();

        if ($branchIds !== null) {
            $customersQuery->whereIn('branch_id', $branchIds);
        }

        if (!empty($normalizedStatuses)) {
            $customersQuery->whereIn('status', $normalizedStatuses);
        }

        $customers = $customersQuery->get([
            'id',
            'branch_id',
            'wifi_package_id',
            'billing_day_of_month',
            'status',
        ]);

        $createdCount = 0;

        DB::transaction(function () use ($customers, $normalizedMonth, $actor, &$createdCount) {
            foreach ($customers as $customer) {
                $invoice = $this->createCustomerInvoice($customer, $normalizedMonth, $actor);

                if ($invoice->wasRecentlyCreated) {
                    $createdCount++;
                }
            }
        });

        ActivityLog::create([
            'branch_id' => count($branchIds ?? []) === 1 ? $branchIds[0] : null,
            'actor_user_id' => $actor?->id,
            'entity_type' => 'invoice_batch',
            'entity_id' => null,
            'action' => 'generate_monthly_invoices',
            'metadata' => [
                'invoice_month' => $normalizedMonth->toDateString(),
                'created_count' => $createdCount,
                'customer_statuses' => $normalizedStatuses,
                'branch_ids' => $branchIds,
                'source' => $actor ? 'manual' : 'scheduled',
            ],
            'created_at' => now(),
        ]);

        return [
            'invoice_month' => $normalizedMonth->toDateString(),
            'customer_statuses' => $normalizedStatuses,
            'created_count' => $createdCount,
        ];
    }

    private function createCustomerInvoice(Customer $customer, Carbon $normalizedMonth, ?User $actor): Invoice
    {
        $billingDay = max(1, min(31, (int) $customer->billing_day_of_month));
        $dueDate = $normalizedMonth->copy()->day(min($billingDay, $normalizedMonth->daysInMonth));
        $packagePrice = (float) ($customer->package?->price ?? 0);
        $invoiceMonth = $normalizedMonth->toDateString();

        $existingInvoice = Invoice::query()
            ->where('customer_id', $customer->id)
            ->whereDate('invoice_month', $invoiceMonth)
            ->first();

        if ($existingInvoice) {
            return $existingInvoice;
        }

        return Invoice::create([
            'customer_id' => $customer->id,
            'invoice_month' => $invoiceMonth,
            'branch_id' => $customer->branch_id,
            'wifi_package_id' => $customer->wifi_package_id,
            'due_date' => $dueDate->toDateString(),
            'billing_day_of_month' => $billingDay,
            'package_name' => $customer->package?->name,
            'package_price' => $packagePrice,
            'total_amount' => $packagePrice,
            'paid_amount' => 0,
            'balance_amount' => $packagePrice,
            'status' => $dueDate->isPast() && $packagePrice > 0 ? 'overdue' : 'unpaid',
            'generated_by_user_id' => $actor?->id,
        ]);
    }
}
