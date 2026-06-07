<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $search = trim((string) $request->query('q', ''));
        $category = trim((string) $request->query('category', ''));
        $month = trim((string) $request->query('month', now()->format('Y-m')));
        $perPage = max(10, min((int) $request->query('per_page', 15), 100));
        $branchIds = $user?->accessibleBranchIds() ?? [];
        $canViewAllBranches = (bool) $user?->canViewAllBranches();
        $categories = ExpenseCategory::query()
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'description']);

        $expensesQuery = Expense::query()
            ->with(['branch:id,name', 'createdBy:id,name'])
            ->orderByDesc('expense_date')
            ->orderByDesc('id');

        if (!$canViewAllBranches) {
            $expensesQuery->whereIn('branch_id', $branchIds);
        }

        if ($search !== '') {
            $expensesQuery->where(function ($query) use ($search) {
                $query->where('title', 'like', '%'.$search.'%')
                    ->orWhere('vendor', 'like', '%'.$search.'%')
                    ->orWhere('reference_no', 'like', '%'.$search.'%')
                    ->orWhere('notes', 'like', '%'.$search.'%');
            });
        }

        if ($category !== '') {
            $expensesQuery->where('category', $category);
        }

        if ($month !== '') {
            try {
                $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
                $end = $start->copy()->endOfMonth();
                $expensesQuery->whereBetween('expense_date', [$start->toDateString(), $end->toDateString()]);
            } catch (\Throwable $exception) {
            }
        }

        $expenses = $expensesQuery->paginate($perPage, [
            'id',
            'branch_id',
            'category',
            'title',
            'amount',
            'expense_date',
            'vendor',
            'reference_no',
            'notes',
            'created_by_user_id',
            'created_at',
        ])->withQueryString();

        $summaryQuery = Expense::query();
        if (!$canViewAllBranches) {
            $summaryQuery->whereIn('branch_id', $branchIds);
        }
        if ($month !== '') {
            try {
                $summaryStart = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
                $summaryEnd = $summaryStart->copy()->endOfMonth();
                $summaryQuery->whereBetween('expense_date', [$summaryStart->toDateString(), $summaryEnd->toDateString()]);
            } catch (\Throwable $exception) {
            }
        }

        $branches = Branch::query()
            ->when(!$canViewAllBranches, fn ($query) => $query->whereIn('id', $branchIds))
            ->orderBy('name')
            ->get(['id', 'name']);
        $canAssignBranch = $canViewAllBranches || count($branchIds) > 1;

        return Inertia::render('Expenses/Index', [
            'expenses' => $expenses,
            'branches' => $branches,
            'canAssignBranch' => $canAssignBranch,
            'filters' => [
                'q' => $search,
                'category' => $category,
                'month' => $month,
                'per_page' => $perPage,
            ],
            'categories' => $categories,
            'summary' => [
                'count' => (clone $summaryQuery)->count(),
                'total_amount' => (float) (clone $summaryQuery)->sum('amount'),
                'top_category' => (clone $summaryQuery)
                    ->selectRaw('category, SUM(amount) as total_amount')
                    ->groupBy('category')
                    ->orderByDesc('total_amount')
                    ->value('category'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $branchId = (int) ($request->input('branch_id') ?: $user?->soleBranchId());

        if ($branchId <= 0 || !$user?->canAccessBranch($branchId)) {
            abort(422, 'Branch is required.');
        }

        $request->merge([
            'branch_id' => $branchId,
            'created_by_user_id' => $user?->id,
        ]);

        $data = $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'category' => ['required', 'string', 'exists:expense_categories,slug'],
            'title' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'expense_date' => ['required', 'date'],
            'vendor' => ['nullable', 'string', 'max:255'],
            'reference_no' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'created_by_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $expense = Expense::create($data);

        ActivityLog::create([
            'branch_id' => $expense->branch_id,
            'actor_user_id' => $user?->id,
            'entity_type' => 'expense',
            'entity_id' => $expense->id,
            'action' => 'create_expense',
            'metadata' => [
                'category' => $expense->category,
                'amount' => $expense->amount,
                'title' => $expense->title,
            ],
            'created_at' => now(),
        ]);

        return redirect()->route('admin.expenses.index');
    }

    public function update(Request $request, Expense $expense): RedirectResponse
    {
        $user = $request->user();
        if (!$user?->canAccessBranch((int) $expense->branch_id)) {
            abort(403);
        }

        $branchId = (int) ($request->input('branch_id') ?: $expense->branch_id);

        if ($branchId <= 0 || !$user?->canAccessBranch($branchId)) {
            abort(422, 'Branch is required.');
        }

        $request->merge(['branch_id' => $branchId]);

        $data = $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'category' => ['required', 'string', 'exists:expense_categories,slug'],
            'title' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'expense_date' => ['required', 'date'],
            'vendor' => ['nullable', 'string', 'max:255'],
            'reference_no' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $expense->update($data);

        ActivityLog::create([
            'branch_id' => $expense->branch_id,
            'actor_user_id' => $user?->id,
            'entity_type' => 'expense',
            'entity_id' => $expense->id,
            'action' => 'update_expense',
            'metadata' => [
                'category' => $expense->category,
                'amount' => $expense->amount,
                'title' => $expense->title,
            ],
            'created_at' => now(),
        ]);

        return redirect()->route('admin.expenses.index');
    }

    public function destroy(Request $request, Expense $expense): RedirectResponse
    {
        $user = $request->user();
        if (!$user?->canAccessBranch((int) $expense->branch_id)) {
            abort(403);
        }

        ActivityLog::create([
            'branch_id' => $expense->branch_id,
            'actor_user_id' => $user?->id,
            'entity_type' => 'expense',
            'entity_id' => $expense->id,
            'action' => 'delete_expense',
            'metadata' => [
                'category' => $expense->category,
                'amount' => $expense->amount,
                'title' => $expense->title,
            ],
            'created_at' => now(),
        ]);

        $expense->delete();

        return redirect()->route('admin.expenses.index');
    }
}
