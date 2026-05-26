<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->string('type')->default('internal');
            $table->string('category');
            $table->string('reminder_key')->unique();
            $table->string('title')->nullable();
            $table->text('message');
            $table->string('status')->default('sent');
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('branch_id');
            $table->index('customer_id');
            $table->index('invoice_id');
            $table->index('type');
            $table->index('category');
            $table->index('status');
            $table->index('scheduled_at');
        });
    }

    public function down()
    {
        Schema::dropIfExists('notifications');
    }
};
