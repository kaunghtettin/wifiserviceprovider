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

        $query = WifiPackage::query()->with('branch:id,name')->orderBy('name');

        if (!$user?->hasRole('super_admin') && !$user?->hasPermission('branches.view_all')) {
            $branchId = $user?->branch_id;
            $query->where(function ($q) use ($branchId) {
                $q->whereNull('branch_id');
                if ($branchId) {
                    $q->orWhere('branch_id', $branchId);
                }
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

        $branches = [];
        if ($user?->hasRole('super_admin')) {
            $branches = Branch::query()->orderBy('name')->get(['id', 'name']);
        }

        return Inertia::render('Packages/Index', [
            'packages' => $packages,
            'branches' => $branches,
            'canAssignBranch' => (bool) $user?->hasRole('super_admin'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $branchId = $user?->hasRole('super_admin')
            ? ($request->input('branch_id') ?: null)
            : ($user?->branch_id ?: null);

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

        $branchId = $user?->hasRole('super_admin')
            ? ($request->input('branch_id') ?: null)
            : ($package->branch_id ?: $user?->branch_id ?: null);

        if (!$user?->hasRole('super_admin') && $package->branch_id && $user?->branch_id && (int) $package->branch_id !== (int) $user->branch_id) {
            abort(403);
        }

        if (!$user?->hasRole('super_admin') && !$package->branch_id && $user?->branch_id) {
            $branchId = $user->branch_id;
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

        if (!$user?->hasRole('super_admin') && $package->branch_id && $user?->branch_id && (int) $package->branch_id !== (int) $user->branch_id) {
            abort(403);
        }

        $package->delete();

        return redirect()->route('admin.packages.index');
    }
}

