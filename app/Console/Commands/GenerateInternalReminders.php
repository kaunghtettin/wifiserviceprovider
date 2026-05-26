<?php

namespace App\Console\Commands;

use App\Services\Notifications\InternalReminderGenerator;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerateInternalReminders extends Command
{
    protected $signature = 'reminders:generate-internal
        {--date= : Target date in Y-m-d format}
        {--branch-id= : Optional branch scope}';

    protected $description = 'Generate internal reminder records for upcoming and overdue invoices';

    public function handle(InternalReminderGenerator $internalReminderGenerator): int
    {
        $dateInput = $this->option('date');

        try {
            $targetDate = $dateInput
                ? Carbon::createFromFormat('Y-m-d', (string) $dateInput)->startOfDay()
                : now()->startOfDay();
        } catch (\Throwable $exception) {
            $this->error('The date must use Y-m-d format, for example 2026-05-23.');

            return self::FAILURE;
        }

        $branchId = $this->option('branch-id');
        $branchId = filled($branchId) ? (int) $branchId : null;

        if ($branchId !== null && $branchId <= 0) {
            $this->error('The branch-id option must be a positive integer.');

            return self::FAILURE;
        }

        $result = $internalReminderGenerator->generate($targetDate, $branchId);

        $this->info(
            "Generated {$result['generated_count']} reminder(s) for {$result['date']} ".
            "(due soon: {$result['due_soon_count']}, overdue: {$result['overdue_count']})."
        );

        return self::SUCCESS;
    }
}
