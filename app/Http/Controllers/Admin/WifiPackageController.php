<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\WifiPackage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WifiPackageController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $branchIds = $user?->accessibleBranchIds() ?? [];
        $canViewAllBranches = (bool) $user?->canViewAllBranches();

        $query = WifiPackage::query()->with('branch:id,name')->orderBy('name');

        if (!$canViewAllBranches) {
            $query->where(function ($q) use ($branchIds) {
                $q->whereNull('branch_id')->orWhereIn('branch_id', $branchIds);
            });
        }

        $packages = $query->get([
            'id',
            'branch_id',
            'name',
            'speed_mbps',
            'price',
            'duration_months',
            'description',
            'status',
            'created_at',
        ]);

        $branches = Branch::query()
            ->when(!$canViewAllBranches, fn ($branchQuery) => $branchQuery->whereIn('id', $branchIds))
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Packages/Index', [
            'packages' => $packages,
            'branches' => $branches,
            'canAssignBranch' => $canViewAllBranches || count($branchIds) > 1,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $branchId = $user?->canViewAllBranches()
            ? ($request->input('branch_id') ?: null)
            : ($request->input('branch_id') ?: $user?->soleBranchId());

        if (!$user?->canViewAllBranches() && (!$branchId || !$user?->canAccessBranch((int) $branchId))) {
            abort(422, 'Branch is required.');
        }

        $request->merge(['branch_id' => $branchId]);

        $data = $request->validate([
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('wifi_packages', 'name')->where(fn ($q) => $q->where('branch_id', $branchId)),
            ],
            'speed_mbps' => ['required', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'min:0'],
            'duration_months' => ['required', 'integer', 'min:1', 'max:120'],
            'description' => ['nullable', 'string', 'max:2000'],
            'status' => ['required', 'in:active,inactive'],
        ]);

        WifiPackage::create($data);

        return redirect()->route('admin.packages.index');
    }

    public function update(Request $request, WifiPackage $package): RedirectResponse
    {
        $user = $request->user();

        if (!$user?->canViewAllBranches() && (!$package->branch_id || !$user?->canAccessBranch((int) $package->branch_id))) {
            abort(403);
        }

        $branchId = $user?->canViewAllBranches()
            ? ($request->input('branch_id') ?: null)
            : ($request->input('branch_id') ?: $package->branch_id);

        if ($branchId && !$user?->canAccessBranch((int) $branchId)) {
            abort(422, 'The selected branch is not available.');
        }

        $request->merge(['branch_id' => $branchId]);

        $data = $request->validate([
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('wifi_packages', 'name')
                    ->ignore($package->id)
                    ->where(fn ($q) => $q->where('branch_id', $branchId)),
            ],
            'speed_mbps' => ['required', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'min:0'],
            'duration_months' => ['required', 'integer', 'min:1', 'max:120'],
            'description' => ['nullable', 'string', 'max:2000'],
            'status' => ['required', 'in:active,inactive'],
        ]);

        $package->update($data);

        return redirect()->route('admin.packages.index');
    }

    public function destroy(Request $request, WifiPackage $package): RedirectResponse
    {
        $user = $request->user();

        if (!$user?->canViewAllBranches() && (!$package->branch_id || !$user?->canAccessBranch((int) $package->branch_id))) {
            abort(403);
        }

        $package->delete();

        return redirect()->route('admin.packages.index');
    }
}
