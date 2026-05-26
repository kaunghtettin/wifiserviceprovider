<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Billing\MonthlyInvoiceGenerator;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerateMonthlyInvoices extends Command
{
    protected $signature = 'invoices:generate-monthly
        {month? : Target billing month in Y-m format}
        {--customer-status=* : Customer statuses to include}
        {--generated-by-user= : Optional user ID recorded as the generator}
        {--branch-id= : Optional branch scope}';

    protected $description = 'Generate monthly invoices for eligible customers';

    public function handle(MonthlyInvoiceGenerator $monthlyInvoiceGenerator): int
    {
        $monthInput = (string) ($this->argument('month') ?: now()->format('Y-m'));

        try {
            $invoiceMonth = Carbon::createFromFormat('Y-m', $monthInput)->startOfMonth();
        } catch (\Throwable $exception) {
            $this->error('The month must use Y-m format, for example 2026-05.');

            return self::FAILURE;
        }

        $statuses = collect($this->option('customer-status'))
            ->filter()
            ->values()
            ->all();

        if (empty($statuses)) {
            $statuses = ['active'];
        }

        $generatedByUserId = $this->option('generated-by-user');
        $actor = $generatedByUserId ? User::query()->find($generatedByUserId) : null;

        if ($generatedByUserId && !$actor) {
            $this->error('The provided generated-by-user ID was not found.');

            return self::FAILURE;
        }

        $branchId = $this->option('branch-id');
        $branchId = filled($branchId) ? (int) $branchId : null;

        if ($branchId !== null && $branchId <= 0) {
            $this->error('The branch-id option must be a positive integer.');

            return self::FAILURE;
        }

        $result = $monthlyInvoiceGenerator->generate($invoiceMonth, $statuses, $actor, $branchId);

        $this->info("Generated {$result['created_count']} invoice(s) for {$invoiceMonth->format('Y-m')}.");

        return self::SUCCESS;
    }
}
