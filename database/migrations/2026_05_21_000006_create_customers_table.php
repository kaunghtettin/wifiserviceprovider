<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('customer_code')->nullable()->unique();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('wifi_package_id')->nullable()->constrained('wifi_packages')->nullOnDelete();
            $table->string('name');
            $table->string('ftth_account_name')->nullable();
            $table->string('ftth_id', 128)->nullable();
            $table->string('phone');
            $table->string('nrc')->nullable();
            $table->text('address')->nullable();
            $table->decimal('gps_lat', 10, 7)->nullable();
            $table->decimal('gps_lng', 10, 7)->nullable();
            $table->date('installation_date')->nullable();
            $table->unsignedTinyInteger('billing_day_of_month');
            $table->string('router_sn')->nullable();
            $table->string('status')->default('active');
            $table->text('notes')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('branch_id');
            $table->index('wifi_package_id');
            $table->index('status');
            $table->index('phone');
            $table->index('ftth_id');
            $table->index('billing_day_of_month');
        });
    }

    public function down()
    {
        Schema::dropIfExists('customers');
    }
};
