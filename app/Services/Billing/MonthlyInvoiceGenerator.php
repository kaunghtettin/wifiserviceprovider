<?php

namespace App\Services\Billing;

use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

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
     * @return array{
     *     combination_id: string|null,
     *     start_month: string,
     *     end_month: string,
     *     requested_count: int,
     *     created_count: int,
     *     reused_count: int,
     *     invoices: array<int, Invoice>
     * }
     */
    public function generateForCustomerMonths(Customer $customer, Carbon $startMonth, int $monthCount, ?User $actor = null): array
    {
        $customer->loadMissing('package:id,name,price');
        $requestedCount = max(1, min(36, $monthCount));
        $normalizedStart = $startMonth->copy()->startOfMonth();
        $months = collect(range(0, $requestedCount - 1))
            ->map(fn (int $offset) => $normalizedStart->copy()->addMonthsNoOverflow($offset)->startOfMonth());

        $monthStrings = $months->map(fn (Carbon $month) => $month->toDateString())->all();
        $existingCombinationIds = Invoice::query()
            ->where('customer_id', $customer->id)
            ->whereIn('invoice_month', $monthStrings)
            ->whereNotNull('combination_id')
            ->distinct()
            ->pluck('combination_id')
            ->values()
            ->all();

        if (!empty($existingCombinationIds)) {
            throw ValidationException::withMessages([
                'start_month' => 'One or more selected months already belong to a combined invoice.',
            ]);
        }

        $combinationId = $requestedCount > 1 ? (string) Str::uuid() : null;
        $createdCount = 0;
        $reusedCount = 0;

        $invoices = DB::transaction(function () use ($customer, $months, $actor, $combinationId, &$createdCount, &$reusedCount) {
            return $months->map(function (Carbon $month) use ($customer, $actor, $combinationId, &$createdCount, &$reusedCount) {
                $invoice = $this->createCustomerInvoice($customer, $month, $actor, $combinationId);

                if ($invoice->wasRecentlyCreated) {
                    $createdCount++;

                    return $invoice;
                }

                $reusedCount++;

                if ($combinationId && !$invoice->combination_id) {
                    $invoice->forceFill(['combination_id' => $combinationId])->save();
                }

                return $invoice->refresh();
            })->all();
        });

        ActivityLog::create([
            'branch_id' => $customer->branch_id,
            'actor_user_id' => $actor?->id,
            'entity_type' => 'invoice_combination',
            'entity_id' => $invoices[0]->id ?? null,
            'action' => 'generate_customer_invoice_combination',
            'metadata' => [
                'customer_id' => $customer->id,
                'combination_id' => $combinationId,
                'start_month' => $normalizedStart->toDateString(),
                'end_month' => $months->last()->toDateString(),
                'requested_count' => $requestedCount,
                'created_count' => $createdCount,
                'reused_count' => $reusedCount,
            ],
            'created_at' => now(),
        ]);

        return [
            'combination_id' => $combinationId,
            'start_month' => $normalizedStart->toDateString(),
            'end_month' => $months->last()->toDateString(),
            'requested_count' => $requestedCount,
            'created_count' => $createdCount,
            'reused_count' => $reusedCount,
            'invoices' => $invoices,
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

    private function createCustomerInvoice(Customer $customer, Carbon $normalizedMonth, ?User $actor, ?string $combinationId = null): Invoice
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
            'combination_id' => $combinationId,
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
