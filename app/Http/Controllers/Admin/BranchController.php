<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BranchController extends Controller
{
    public function index(): Response
    {
        $branches = Branch::query()
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'phone', 'address', 'created_at']);

        return Inertia::render('Branches/Index', [
            'branches' => $branches,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:branches,name'],
            'code' => ['nullable', 'string', 'max:64', 'unique:branches,code'],
            'phone' => ['nullable', 'string', 'max:64'],
            'address' => ['nullable', 'string', 'max:2000'],
        ]);

        Branch::create($data);

        return redirect()->route('admin.branches.index');
    }

    public function update(Request $request, Branch $branch): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:branches,name,'.$branch->id],
            'code' => ['nullable', 'string', 'max:64', 'unique:branches,code,'.$branch->id],
            'phone' => ['nullable', 'string', 'max:64'],
            'address' => ['nullable', 'string', 'max:2000'],
        ]);

        $branch->update($data);

        return redirect()->route('admin.branches.index');
    }

    public function destroy(Branch $branch): RedirectResponse
    {
        $branch->delete();

        return redirect()->route('admin.branches.index');
    }
}

