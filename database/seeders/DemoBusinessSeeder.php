<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Role;
use App\Models\User;
use App\Models\WifiPackage;
use App\Services\Billing\MonthlyInvoiceGenerator;
use App\Services\Notifications\InternalReminderGenerator;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;

class DemoBusinessSeeder extends Seeder
{
    private const BRANCH_BLUEPRINTS = [
        [
            'code' => 'YGN',
            'name' => 'Yangon Branch',
            'phone' => '09-420000001',
            'address' => 'Hledan Township, Yangon',
        ],
        [
            'code' => 'MDY',
            'name' => 'Mandalay Branch',
            'phone' => '09-420000002',
            'address' => 'Chan Aye Tharzan, Mandalay',
        ],
        [
            'code' => 'TGI',
            'name' => 'Taunggyi Branch',
            'phone' => '09-420000003',
            'address' => 'Myoma Ward, Taunggyi',
        ],
    ];

    private const PACKAGE_BLUEPRINTS = [
        ['name' => 'Starter 10Mbps', 'speed_mbps' => 10, 'price' => 18000],
        ['name' => 'Silver 20Mbps', 'speed_mbps' => 20, 'price' => 28000],
        ['name' => 'Gold 30Mbps', 'speed_mbps' => 30, 'price' => 38000],
        ['name' => 'Platinum 50Mbps', 'speed_mbps' => 50, 'price' => 52000],
    ];

    private const EXPENSE_CATEGORIES = [
        'office',
        'salary',
        'transport',
        'maintenance',
        'network',
        'utility',
    ];

    public function run(): void
    {
        $faker = fake('en_US');

        $superAdminRole = Role::query()->where('name', 'super_admin')->firstOrFail();
        $adminRole = Role::query()->where('name', 'admin')->firstOrFail();
        $staffRole = Role::query()->where('name', 'staff')->firstOrFail();

        $branches = $this->seedBranches();
        $users = $this->seedUsers($branches, $superAdminRole, $adminRole, $staffRole);
        $packages = $this->seedPackages($branches);
        $customers = $this->seedCustomers($branches, $packages, $users, $faker);

        $invoiceGenerator = app(MonthlyInvoiceGenerator::class);
        $months = collect(range(5, 0))
            ->map(fn (int $offset) => now()->copy()->subMonths($offset)->startOfMonth())
            ->values();

        foreach ($months as $month) {
            foreach ($branches as $branch) {
                $invoiceGenerator->generate(
                    $month,
                    ['active', 'pending', 'suspended'],
                    $users[$branch->code]['admin'],
                    $branch->id
                );
            }
        }

        $this->seedPayments($months, $branches, $users);
        $this->seedExpenses($months, $branches, $users);
        $this->seedReminders($branches);

        $this->command?->info(sprintf(
            'Demo business data ready: %d branches, %d customers, %d invoices, %d payments, %d expenses.',
            $branches->count(),
            $customers->count(),
            Invoice::query()->count(),
            Payment::query()->count(),
            Expense::query()->count()
        ));
    }

    /**
     * @return Collection<int, Branch>
     */
    private function seedBranches(): Collection
    {
        $branches = collect();

        foreach (self::BRANCH_BLUEPRINTS as $index => $blueprint) {
            if ($index === 0) {
                $branch = Branch::query()
                    ->whereIn('code', [$blueprint['code'], 'MAIN'])
                    ->orWhere('name', 'Main Branch')
                    ->first();

                if ($branch) {
                    $branch->update($blueprint);
                } else {
                    $branch = Branch::create($blueprint);
                }
            } else {
                $branch = Branch::query()->updateOrCreate(
                    ['code' => $blueprint['code']],
                    $blueprint
                );
            }

            $branches->push($branch->fresh());
        }

        return $branches;
    }

    /**
     * @param  Collection<int, Branch>  $branches
     * @return array<string, array{admin: User, staff: Collection<int, User>}>
     */
    private function seedUsers(Collection $branches, Role $superAdminRole, Role $adminRole, Role $staffRole): array
    {
        $usersByBranch = [];
        $defaultPassword = Hash::make('password');

        $superAdmin = User::query()->where('email', env('SUPER_ADMIN_EMAIL', 'superadmin@localhost'))->first();
        if ($superAdmin) {
            $superAdmin->update([
                'branch_id' => $branches->first()?->id,
                'role_id' => $superAdminRole->id,
            ]);
        }

        foreach ($branches as $branch) {
            $branchCode = strtolower($branch->code);

            $admin = User::query()->updateOrCreate(
                ['email' => "{$branchCode}.admin@demo.local"],
                [
                    'branch_id' => $branch->id,
                    'role_id' => $adminRole->id,
                    'name' => "{$branch->name} Admin",
                    'phone' => '09-55'.str_pad((string) $branch->id, 6, '0', STR_PAD_LEFT),
                    'password' => $defaultPassword,
                    'status' => 'active',
                    'email_verified_at' => now(),
                ]
            );

            $staffMembers = collect();
            foreach ([1, 2] as $number) {
                $staffMembers->push(
                    User::query()->updateOrCreate(
                        ['email' => "{$branchCode}.staff{$number}@demo.local"],
                        [
                            'branch_id' => $branch->id,
                            'role_id' => $staffRole->id,
                            'name' => "{$branch->name} Staff {$number}",
                            'phone' => '09-66'.str_pad((string) (($branch->id * 10) + $number), 6, '0', STR_PAD_LEFT),
                            'password' => $defaultPassword,
                            'status' => 'active',
                            'email_verified_at' => now(),
                        ]
                    )
                );
            }

            $usersByBranch[$branch->code] = [
                'admin' => $admin->fresh(),
                'staff' => $staffMembers->map->fresh(),
            ];
        }

        return $usersByBranch;
    }

    /**
     * @param  Collection<int, Branch>  $branches
     * @return array<string, Collection<int, WifiPackage>>
     */
    private function seedPackages(Collection $branches): array
    {
        $packagesByBranch = [];

        foreach ($branches as $branch) {
            $packagesByBranch[$branch->code] = collect(self::PACKAGE_BLUEPRINTS)
                ->map(function (array $blueprint) use ($branch) {
                    return WifiPackage::query()->updateOrCreate(
                        [
                            'branch_id' => $branch->id,
                            'name' => $blueprint['name'],
                        ],
                        [
                            'speed_mbps' => $blueprint['speed_mbps'],
                            'price' => $blueprint['price'],
                            'duration_months' => 1,
                            'description' => "{$blueprint['name']} plan for {$branch->name}",
                            'status' => 'active',
                        ]
                    );
                })
                ->map->fresh();
        }

        return $packagesByBranch;
    }

    /**
     * @param  Collection<int, Branch>  $branches
     * @param  array<string, Collection<int, WifiPackage>>  $packagesByBranch
     * @param  array<string, array{admin: User, staff: Collection<int, User>}>  $usersByBranch
     * @return Collection<int, \App\Models\Customer>
     */
    private function seedCustomers(Collection $branches, array $packagesByBranch, array $usersByBranch, $faker): Collection
    {
        $statusPool = ['active', 'active', 'active', 'active', 'active', 'pending', 'suspended', 'disconnected'];
        $customers = collect();
        $targetCounts = [167, 167, 166];
        $counter = 1;

        foreach ($branches as $index => $branch) {
            $branchCustomers = $targetCounts[$index] ?? 0;
            $branchCode = $branch->code;
            $packages = $packagesByBranch[$branchCode];
            $operatorIds = $usersByBranch[$branchCode]['staff']->pluck('id')->push($usersByBranch[$branchCode]['admin']->id)->values();

            for ($position = 1; $position <= $branchCustomers; $position++, $counter++) {
                $status = $statusPool[($counter - 1) % count($statusPool)];
                $installationDate = now()->copy()->subMonths(rand(0, 20))->subDays(rand(0, 27));
                $selectedPackage = $packages[($counter + $position) % $packages->count()];

                $customer = \App\Models\Customer::query()->updateOrCreate(
                    ['customer_code' => sprintf('DEMO-%s-%04d', $branchCode, $position)],
                    [
                        'branch_id' => $branch->id,
                        'wifi_package_id' => $selectedPackage->id,
                        'name' => $faker->name(),
                        'phone' => '09'.str_pad((string) (420000000 + $counter), 9, '0', STR_PAD_LEFT),
                        'nrc' => sprintf('%d/%s(N)%06d', rand(1, 14), strtoupper($faker->lexify('???')), rand(100000, 999999)),
                        'address' => $faker->streetAddress().', '.$branch->name,
                        'gps_lat' => round(16 + ($branch->id * 0.8) + ($position / 1000), 7),
                        'gps_lng' => round(96 + ($branch->id * 0.5) + ($position / 1000), 7),
                        'installation_date' => $installationDate->toDateString(),
                        'billing_day_of_month' => (($counter - 1) % 28) + 1,
                        'router_sn' => sprintf('ONU-%s-%05d', $branchCode, $position),
                        'status' => $status,
                        'notes' => 'Demo seeded customer for business simulation.',
                        'created_by_user_id' => $operatorIds[($position - 1) % $operatorIds->count()],
                    ]
                );

                $customers->push($customer->fresh());
            }
        }

        return $customers;
    }

    /**
     * @param  Collection<int, Carbon>  $months
     * @param  Collection<int, Branch>  $branches
     * @param  array<string, array{admin: User, staff: Collection<int, User>}>  $usersByBranch
     */
    private function seedPayments(Collection $months, Collection $branches, array $usersByBranch): void
    {
        foreach ($months as $monthIndex => $month) {
            $branchInvoices = Invoice::query()
                ->whereDate('invoice_month', $month->toDateString())
                ->with('customer')
                ->get();

            foreach ($branchInvoices as $invoice) {
                $branch = $branches->firstWhere('id', $invoice->branch_id);
                if (!$branch) {
                    continue;
                }

                $staffPool = $usersByBranch[$branch->code]['staff'];
                $receiver = $staffPool[($invoice->id + $monthIndex) % max(1, $staffPool->count())] ?? $usersByBranch[$branch->code]['admin'];
                $score = ($invoice->id * 37 + $monthIndex * 17) % 100;
                $monthsAgo = 5 - $monthIndex;

                if ($monthsAgo >= 4) {
                    $fullThreshold = 82;
                    $partialThreshold = 93;
                } elseif ($monthsAgo >= 2) {
                    $fullThreshold = 70;
                    $partialThreshold = 87;
                } else {
                    $fullThreshold = 56;
                    $partialThreshold = 76;
                }

                $firstReference = sprintf('DEMO-PAY-%d-1', $invoice->id);
                $secondReference = sprintf('DEMO-PAY-%d-2', $invoice->id);

                if ($score < $fullThreshold) {
                    Payment::query()->firstOrCreate(
                        ['reference_no' => $firstReference],
                        [
                            'branch_id' => $invoice->branch_id,
                            'invoice_id' => $invoice->id,
                            'customer_id' => $invoice->customer_id,
                            'amount' => $invoice->total_amount,
                            'paid_at' => $invoice->due_date->copy()->subDays(($score % 3) + 1)->setTime(10, 0),
                            'method' => $score % 2 === 0 ? 'cash' : 'bank_transfer',
                            'notes' => 'Demo seeded full payment.',
                            'received_by_user_id' => $receiver?->id,
                        ]
                    );
                } elseif ($score < $partialThreshold) {
                    $partialAmount = round((float) $invoice->total_amount * (0.45 + (($score % 20) / 100)), 2);

                    Payment::query()->firstOrCreate(
                        ['reference_no' => $firstReference],
                        [
                            'branch_id' => $invoice->branch_id,
                            'invoice_id' => $invoice->id,
                            'customer_id' => $invoice->customer_id,
                            'amount' => min($partialAmount, (float) $invoice->total_amount),
                            'paid_at' => $invoice->due_date->copy()->addDays(($score % 5) + 1)->setTime(14, 0),
                            'method' => 'cash',
                            'notes' => 'Demo seeded partial payment.',
                            'received_by_user_id' => $receiver?->id,
                        ]
                    );

                    if ($monthsAgo >= 3 && $score % 2 === 0) {
                        $existingAmount = (float) Payment::query()->where('reference_no', $firstReference)->value('amount');
                        $remainingAmount = max((float) $invoice->total_amount - $existingAmount, 0);

                        if ($remainingAmount > 0.009) {
                            Payment::query()->firstOrCreate(
                                ['reference_no' => $secondReference],
                                [
                                    'branch_id' => $invoice->branch_id,
                                    'invoice_id' => $invoice->id,
                                    'customer_id' => $invoice->customer_id,
                                    'amount' => $remainingAmount,
                                    'paid_at' => $invoice->due_date->copy()->addDays(($score % 8) + 7)->setTime(16, 30),
                                    'method' => 'bank_transfer',
                                    'notes' => 'Demo seeded balance payment.',
                                    'received_by_user_id' => $usersByBranch[$branch->code]['admin']->id,
                                ]
                            );
                        }
                    }
                }

                $invoice->refresh();
                $invoice->refreshPaymentState();
            }
        }
    }

    /**
     * @param  Collection<int, Carbon>  $months
     * @param  Collection<int, Branch>  $branches
     * @param  array<string, array{admin: User, staff: Collection<int, User>}>  $usersByBranch
     */
    private function seedExpenses(Collection $months, Collection $branches, array $usersByBranch): void
    {
        foreach ($months as $month) {
            foreach ($branches as $branch) {
                foreach (self::EXPENSE_CATEGORIES as $index => $category) {
                    $reference = sprintf('DEMO-EXP-%s-%s-%s', $branch->code, $month->format('Ym'), strtoupper(substr($category, 0, 3)));
                    $amount = match ($category) {
                        'salary' => 850000 + ($branch->id * 120000),
                        'network' => 320000 + ($branch->id * 45000),
                        'office' => 160000 + ($month->month * 2000),
                        'maintenance' => 145000 + (($month->month + $branch->id) * 5000),
                        'utility' => 110000 + ($branch->id * 15000),
                        default => 90000 + (($branch->id + $index) * 12000),
                    };

                    Expense::query()->updateOrCreate(
                        ['reference_no' => $reference],
                        [
                            'branch_id' => $branch->id,
                            'category' => $category,
                            'title' => ucfirst($category).' expense',
                            'amount' => $amount,
                            'expense_date' => $month->copy()->day(min(25, 4 + ($index * 3)))->toDateString(),
                            'vendor' => 'Demo Vendor '.strtoupper(substr($category, 0, 1)),
                            'notes' => "Seeded {$category} expense for {$branch->name}.",
                            'created_by_user_id' => $usersByBranch[$branch->code]['admin']->id,
                        ]
                    );
                }
            }
        }
    }

    /**
     * @param  Collection<int, Branch>  $branches
     */
    private function seedReminders(Collection $branches): void
    {
        $reminderGenerator = app(InternalReminderGenerator::class);

        foreach ($branches as $branch) {
            $reminderGenerator->generate(now()->copy()->startOfDay(), $branch->id);
        }
    }
}
