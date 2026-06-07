<?php

namespace App\Services\Billing;

use App\Models\Customer;
use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class ContinuousOverdueTracker
{
    /**
     * @param  array<int, int>|null  $customerIds
     * @return Collection<int, array<string, mixed>>
     */
    public function track(Carbon $asOfDate, ?array $customerIds = null): Collection
    {
        $asOfDate = $asOfDate->copy()->startOfDay();
        $currentInvoiceMonth = $asOfDate->copy()->startOfMonth()->toDateString();

        $invoices = Invoice::query()
            ->whereDate('invoice_month', '<=', $currentInvoiceMonth)
            ->when($customerIds !== null, fn ($query) => $query->whereIn('customer_id', $customerIds))
            ->orderByDesc('invoice_month')
            ->get([
                'id',
                'customer_id',
                'invoice_month',
                'due_date',
                'total_amount',
                'paid_amount',
                'balance_amount',
                'status',
            ])
            ->groupBy('customer_id');

        return $invoices
            ->map(fn (Collection $customerInvoices, $customerId) => $this->calculate(
                (int) $customerId,
                $customerInvoices,
                $asOfDate
            ))
            ->filter(fn (array $result) => $result['consecutive_months'] > 0)
            ->values();
    }

    /**
     * @return array<string, mixed>
     */
    public function forCustomer(Customer $customer, Carbon $asOfDate): array
    {
        return $this->track($asOfDate, [$customer->id])->first() ?? [
            'customer_id' => $customer->id,
            'consecutive_months' => 0,
            'outstanding_balance' => 0.0,
            'oldest_invoice_month' => null,
            'latest_invoice_month' => null,
            'latest_due_date' => null,
            'invoice_ids' => [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function calculate(int $customerId, Collection $invoices, Carbon $asOfDate): array
    {
        $monthlyInvoices = $invoices
            ->sortByDesc(fn (Invoice $invoice) => $invoice->invoice_month->format('Y-m'))
            ->unique(fn (Invoice $invoice) => $invoice->invoice_month->format('Y-m'))
            ->values();

        $latestInvoice = $monthlyInvoices->first();
        if (!$latestInvoice || (float) $latestInvoice->balance_amount <= 0) {
            return $this->emptyResult($customerId);
        }

        while (
            $latestInvoice
            && (float) $latestInvoice->balance_amount > 0
            && $latestInvoice->due_date
            && $latestInvoice->due_date->copy()->startOfDay()->gt($asOfDate)
        ) {
            $monthlyInvoices = $monthlyInvoices->skip(1)->values();
            $latestInvoice = $monthlyInvoices->first();

            if (!$latestInvoice || (float) $latestInvoice->balance_amount <= 0) {
                return $this->emptyResult($customerId);
            }
        }

        $streak = collect([$latestInvoice]);
        $expectedMonth = $latestInvoice->invoice_month->copy()->subMonthNoOverflow()->startOfMonth();

        foreach ($monthlyInvoices->skip(1) as $invoice) {
            if (!$invoice->invoice_month->isSameMonth($expectedMonth)) {
                break;
            }

            if ((float) $invoice->balance_amount <= 0) {
                break;
            }

            $streak->push($invoice);
            $expectedMonth->subMonthNoOverflow();
        }

        $oldestInvoice = $streak->last();

        return [
            'customer_id' => $customerId,
            'consecutive_months' => $streak->count(),
            'outstanding_balance' => round((float) $streak->sum('balance_amount'), 2),
            'oldest_invoice_month' => $oldestInvoice?->invoice_month?->toDateString(),
            'latest_invoice_month' => $latestInvoice->invoice_month->toDateString(),
            'latest_due_date' => $latestInvoice->due_date?->toDateString(),
            'days_overdue' => $latestInvoice->due_date
                ? $latestInvoice->due_date->copy()->startOfDay()->diffInDays($asOfDate)
                : 0,
            'invoice_ids' => $streak->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyResult(int $customerId): array
    {
        return [
            'customer_id' => $customerId,
            'consecutive_months' => 0,
            'outstanding_balance' => 0.0,
            'oldest_invoice_month' => null,
            'latest_invoice_month' => null,
            'latest_due_date' => null,
            'days_overdue' => 0,
            'invoice_ids' => [],
        ];
    }
}
