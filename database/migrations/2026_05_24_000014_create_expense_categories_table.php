<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description', 500)->nullable();
            $table->timestamps();
        });

        $defaultCategories = collect([
            'office',
            'salary',
            'transport',
            'maintenance',
            'network',
            'utility',
            'marketing',
            'other',
        ]);

        $existingExpenseCategories = collect();
        if (Schema::hasTable('expenses')) {
            $existingExpenseCategories = DB::table('expenses')
                ->select('category')
                ->distinct()
                ->pluck('category')
                ->filter();
        }

        $categories = $defaultCategories
            ->merge($existingExpenseCategories)
            ->map(fn ($category) => trim((string) $category))
            ->filter()
            ->unique()
            ->values()
            ->map(function ($category) {
                return [
                    'name' => Str::of($category)->replace(['-', '_'], ' ')->title()->value(),
                    'slug' => Str::slug($category, '_'),
                    'description' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })
            ->all();

        if (!empty($categories)) {
            DB::table('expense_categories')->insert($categories);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_categories');
    }
};
