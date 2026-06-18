<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            if (!Schema::hasColumn('customers', 'ftth_account_name')) {
                $table->string('ftth_account_name')->nullable()->after('name');
            }

            if (!Schema::hasColumn('customers', 'ftth_id')) {
                $table->string('ftth_id', 128)->nullable()->after('ftth_account_name');
                $table->index('ftth_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            if (Schema::hasColumn('customers', 'ftth_id')) {
                $table->dropIndex(['ftth_id']);
                $table->dropColumn('ftth_id');
            }

            if (Schema::hasColumn('customers', 'ftth_account_name')) {
                $table->dropColumn('ftth_account_name');
            }
        });
    }
};
