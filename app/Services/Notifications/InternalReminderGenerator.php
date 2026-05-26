<?php

namespace App\Services\Notifications;

use App\Models\ActivityLog;
use App\Models\Invoice;
use App\Models\Notification;
use Carbon\Carbon;

class InternalReminderGenerator
{
    private int $dueSoonLeadDays;

    private int $overdueThresholdDays;

    public function __construct(int $dueSoonLeadDays = 1, int $overdueThresholdDays = 3)
    {
        $this->dueSoonLeadDays = $dueSoonLeadDays;
        $this->overdueThresholdDays = $overdueThresholdDays;
    }

    /**
     * @return array{generated_count: int, due_soon_count: int, overdue_count: int, date: string}
     */
    public function generate(?Carbon $date = null, ?int $branchId = null): array
    {
        $targetDate = ($date ?: now())->copy()->startOfDay();
        $dueSoonDate = $targetDate->copy()->addDays($this->dueSoonLeadDays)->toDateString();
        $overdueCutoffDate = $targetDate->copy()->subDays($this->overdueThresholdDays)->toDateString();

        $invoices = Invoice::query()
            ->with([
                'branch:id,name',
                'customer:id,name,customer_code,phone',
            ])
            ->when($branchId, fn ($query) => $query->where('branch_id', $branchId))
            ->where('balance_amount', '>', 0)
            ->whereIn('status', ['unpaid', 'partial', 'overdue'])
            ->where(function ($query) use ($dueSoonDate, $overdueCutoffDate) {
                $query->whereDate('due_date', $dueSoonDate)
                    ->orWhereDate('due_date', '<=', $overdueCutoffDate);
            })
            ->get();

        $generatedCount = 0;
        $dueSoonCount = 0;
        $overdueCount = 0;

        foreach ($invoices as $invoice) {
            $dueDate = $invoice->due_date?->copy()->startOfDay();
            if (!$dueDate) {
                continue;
            }

            $isDueSoon = $dueDate->toDateString() === $dueSoonDate;
            $isOverdue = $dueDate->toDateString() <= $overdueCutoffDate;

            if (!$isDueSoon && !$isOverdue) {
                continue;
            }

            $category = $isOverdue ? 'invoice_overdue' : 'invoice_due_soon';
            $reminderKey = implode(':', [$category, $invoice->id, $targetDate->toDateString()]);

            $daysLate = max(0, $dueDate->diffInDays($targetDate, false));
            $title = $isOverdue ? 'Overdue payment reminder' : 'Upcoming due reminder';
            $message = $isOverdue
                ? sprintf(
                    '%s is overdue by %d day(s). Invoice %s still has an outstanding balance of %s.',
                    $invoice->customer?->name ?: 'A customer',
                    $daysLate,
                    $invoice->invoice_number ?: '#'.$invoice->id,
                    number_format((float) $invoice->balance_amount, 2)
                )
                : sprintf(
                    '%s has invoice %s due on %s with an outstanding balance of %s.',
                    $invoice->customer?->name ?: 'A customer',
                    $invoice->invoice_number ?: '#'.$invoice->id,
                    $dueDate->toDateString(),
                    number_format((float) $invoice->balance_amount, 2)
                );

            $notification = Notification::firstOrCreate(
                ['reminder_key' => $reminderKey],
                [
                    'branch_id' => $invoice->branch_id,
                    'customer_id' => $invoice->customer_id,
                    'invoice_id' => $invoice->id,
                    'type' => 'internal',
                    'category' => $category,
                    'title' => $title,
                    'message' => $message,
                    'status' => 'sent',
                    'scheduled_at' => $targetDate,
                    'sent_at' => now(),
                    'metadata' => [
                        'invoice_number' => $invoice->invoice_number,
                        'customer_name' => $invoice->customer?->name,
                        'customer_code' => $invoice->customer?->customer_code,
                        'balance_amount' => (float) $invoice->balance_amount,
                        'due_date' => $dueDate->toDateString(),
                        'days_late' => $daysLate,
                    ],
                ]
            );

            if (!$notification->wasRecentlyCreated) {
                continue;
            }

            $generatedCount++;
            if ($isOverdue) {
                $overdueCount++;
            } else {
                $dueSoonCount++;
            }
        }

        ActivityLog::create([
            'branch_id' => $branchId,
            'actor_user_id' => null,
            'entity_type' => 'notification_batch',
            'entity_id' => null,
            'action' => 'generate_internal_reminders',
            'metadata' => [
                'date' => $targetDate->toDateString(),
                'branch_id' => $branchId,
                'generated_count' => $generatedCount,
                'due_soon_count' => $dueSoonCount,
                'overdue_count' => $overdueCount,
            ],
            'created_at' => now(),
        ]);

        return [
            'generated_count' => $generatedCount,
            'due_soon_count' => $dueSoonCount,
            'overdue_count' => $overdueCount,
            'date' => $targetDate->toDateString(),
        ];
    }
}
