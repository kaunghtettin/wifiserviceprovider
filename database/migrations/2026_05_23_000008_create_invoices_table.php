<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->nullable()->unique();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('wifi_package_id')->nullable()->constrained('wifi_packages')->nullOnDelete();
            $table->date('invoice_month');
            $table->date('due_date');
            $table->unsignedTinyInteger('billing_day_of_month');
            $table->string('package_name')->nullable();
            $table->decimal('package_price', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->decimal('balance_amount', 12, 2)->default(0);
            $table->string('status')->default('unpaid');
            $table->timestamp('last_payment_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('generated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['customer_id', 'invoice_month']);
            $table->index('branch_id');
            $table->index('status');
            $table->index('invoice_month');
            $table->index('due_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('invoices');
    }
};
