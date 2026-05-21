<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('wifi_packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('name');
            $table->unsignedInteger('speed_mbps');
            $table->decimal('price', 12, 2)->default(0);
            $table->unsignedSmallInteger('duration_months')->default(1);
            $table->text('description')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->index('branch_id');
            $table->index('status');
            $table->index('name');
        });
    }

    public function down()
    {
        Schema::dropIfExists('wifi_packages');
    }
};

