<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->string('scope')->default('branch')->after('name')->index();
        });

        Schema::table('branch_user', function (Blueprint $table) {
            $table->foreignId('role_id')
                ->nullable()
                ->after('branch_id')
                ->constrained('roles')
                ->nullOnDelete();
        });

        DB::table('roles')->where('name', 'super_admin')->update(['scope' => 'global']);
        DB::table('permissions')->updateOrInsert(
            ['key' => 'reports.global'],
            [
                'description' => 'View the consolidated global summary',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        DB::statement(
            'UPDATE branch_user
             SET role_id = (SELECT users.role_id FROM users WHERE users.id = branch_user.user_id)
             WHERE role_id IS NULL'
        );

        $branchIds = DB::table('branches')->orderBy('id')->pluck('id');
        $globalPackages = DB::table('wifi_packages')->whereNull('branch_id')->get();

        foreach ($globalPackages as $package) {
            $packageIdsByBranch = [];
            $originalUsed = false;

            foreach ($branchIds as $branchId) {
                $existingId = DB::table('wifi_packages')
                    ->where('branch_id', $branchId)
                    ->where('name', $package->name)
                    ->value('id');

                if ($existingId) {
                    $packageIdsByBranch[(int) $branchId] = (int) $existingId;
                    continue;
                }

                if (!$originalUsed) {
                    DB::table('wifi_packages')
                        ->where('id', $package->id)
                        ->update(['branch_id' => $branchId]);

                    $packageIdsByBranch[(int) $branchId] = (int) $package->id;
                    $originalUsed = true;
                    continue;
                }

                $packageIdsByBranch[(int) $branchId] = (int) DB::table('wifi_packages')->insertGetId([
                    'branch_id' => $branchId,
                    'name' => $package->name,
                    'speed_mbps' => $package->speed_mbps,
                    'price' => $package->price,
                    'duration_months' => $package->duration_months,
                    'description' => $package->description,
                    'status' => $package->status,
                    'created_at' => $package->created_at,
                    'updated_at' => $package->updated_at,
                ]);
            }

            foreach ($packageIdsByBranch as $branchId => $packageId) {
                DB::table('customers')
                    ->where('wifi_package_id', $package->id)
                    ->where('branch_id', $branchId)
                    ->update(['wifi_package_id' => $packageId]);

                DB::table('invoices')
                    ->where('wifi_package_id', $package->id)
                    ->where('branch_id', $branchId)
                    ->update(['wifi_package_id' => $packageId]);
            }

            if (!$originalUsed && $branchIds->isNotEmpty()) {
                DB::table('wifi_packages')->where('id', $package->id)->delete();
            }
        }
    }

    public function down()
    {
        Schema::table('branch_user', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
        });

        Schema::table('roles', function (Blueprint $table) {
            $table->dropIndex(['scope']);
            $table->dropColumn('scope');
        });
    }
};
