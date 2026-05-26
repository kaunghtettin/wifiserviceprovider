<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseCategoryController extends Controller
{
    public function index(): Response
    {
        $usageCounts = Expense::query()
            ->select('category', DB::raw('COUNT(*) as total'))
            ->groupBy('category')
            ->pluck('total', 'category');

        $categories = ExpenseCategory::query()
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'description', 'created_at'])
            ->map(function (ExpenseCategory $category) use ($usageCounts) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'description' => $category->description,
                    'created_at' => $category->created_at,
                    'expense_count' => (int) ($usageCounts[$category->slug] ?? 0),
                ];
            })
            ->values();

        return Inertia::render('ExpenseCategories/Index', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $slug = $this->makeUniqueSlug($data['name']);

        ExpenseCategory::create([
            'name' => $data['name'],
            'slug' => $slug,
            'description' => $data['description'] ?? null,
        ]);

        return redirect()
            ->route('admin.expense-categories.index')
            ->with('success', 'Expense category created successfully.');
    }

    public function update(Request $request, ExpenseCategory $expenseCategory): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $newSlug = $this->makeUniqueSlug($data['name'], $expenseCategory->id);
        $oldSlug = $expenseCategory->slug;

        if ($newSlug !== $oldSlug) {
            Expense::query()
                ->where('category', $oldSlug)
                ->update(['category' => $newSlug]);
        }

        $expenseCategory->update([
            'name' => $data['name'],
            'slug' => $newSlug,
            'description' => $data['description'] ?? null,
        ]);

        return redirect()
            ->route('admin.expense-categories.index')
            ->with('success', 'Expense category updated successfully.');
    }

    public function destroy(ExpenseCategory $expenseCategory): RedirectResponse
    {
        $usageCount = Expense::query()->where('category', $expenseCategory->slug)->count();

        if ($usageCount > 0) {
            return redirect()
                ->route('admin.expense-categories.index')
                ->with('error', 'This category is already used by expense records and cannot be deleted.');
        }

        $expenseCategory->delete();

        return redirect()
            ->route('admin.expense-categories.index')
            ->with('success', 'Expense category deleted successfully.');
    }

    private function makeUniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $baseSlug = Str::slug($name, '_');
        $baseSlug = $baseSlug !== '' ? $baseSlug : 'expense_category';
        $slug = $baseSlug;
        $suffix = 2;

        while (
            ExpenseCategory::query()
                ->where('slug', $slug)
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $baseSlug.'_'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
