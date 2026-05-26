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
     * @param  array<int, string>  $statuses
     * @return array{invoice_month: string, customer_statuses: array<int, string>, created_count: int}
     */
    public function generate(Carbon $invoiceMonth, array $statuses = [], ?User $actor = null, ?int $branchId = null): array
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

        if ($branchId) {
            $customersQuery->where('branch_id', $branchId);
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
                $billingDay = max(1, min(31, (int) $customer->billing_day_of_month));
                $daysInMonth = $normalizedMonth->daysInMonth;
                $dueDate = $normalizedMonth->copy()->day(min($billingDay, $daysInMonth));
                $packagePrice = (float) ($customer->package?->price ?? 0);

                $invoice = Invoice::firstOrCreate(
                    [
                        'customer_id' => $customer->id,
                        'invoice_month' => $normalizedMonth->toDateString(),
                    ],
                    [
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
                    ],
                );

                if ($invoice->wasRecentlyCreated) {
                    $createdCount++;
                }
            }
        });

        ActivityLog::create([
            'branch_id' => $branchId ?: $actor?->branch_id,
            'actor_user_id' => $actor?->id,
            'entity_type' => 'invoice_batch',
            'entity_id' => null,
            'action' => 'generate_monthly_invoices',
            'metadata' => [
                'invoice_month' => $normalizedMonth->toDateString(),
                'created_count' => $createdCount,
                'customer_statuses' => $normalizedStatuses,
                'branch_id' => $branchId,
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
}
