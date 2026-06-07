<?php

namespace App\Services\Billing;

use App\Models\ActivityLog;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentRecorder
{
    /**
     * @param  array{amount: float|int|string, paid_at: string, method: string, reference_no?: ?string, notes?: ?string}  $data
     */
    public function record(Invoice $invoice, array $data, ?User $actor = null): Payment
    {
        return DB::transaction(function () use ($invoice, $data, $actor) {
            $lockedInvoice = Invoice::query()
                ->lockForUpdate()
                ->findOrFail($invoice->id);

            $lockedInvoice->refreshPaymentState();

            $amount = round((float) $data['amount'], 2);
            $balance = round((float) $lockedInvoice->fresh()->balance_amount, 2);

            if ($amount - $balance > 0.00001) {
                throw ValidationException::withMessages([
                    'amount' => 'Payment amount cannot exceed the invoice balance.',
                ]);
            }

            $payment = Payment::create([
                'branch_id' => $lockedInvoice->branch_id,
                'invoice_id' => $lockedInvoice->id,
                'customer_id' => $lockedInvoice->customer_id,
                'amount' => $amount,
                'paid_at' => $data['paid_at'],
                'method' => $data['method'],
                'reference_no' => $data['reference_no'] ?? null,
                'notes' => $data['notes'] ?? null,
                'received_by_user_id' => $actor?->id,
            ]);

            $lockedInvoice->refreshPaymentState();

            ActivityLog::create([
                'branch_id' => $lockedInvoice->branch_id,
                'actor_user_id' => $actor?->id,
                'entity_type' => 'payment',
                'entity_id' => $payment->id,
                'action' => 'record_payment',
                'metadata' => [
                    'invoice_id' => $lockedInvoice->id,
                    'invoice_number' => $lockedInvoice->invoice_number,
                    'customer_id' => $lockedInvoice->customer_id,
                    'amount' => $amount,
                    'method' => $payment->method,
                ],
                'created_at' => now(),
            ]);

            return $payment;
        });
    }
}
