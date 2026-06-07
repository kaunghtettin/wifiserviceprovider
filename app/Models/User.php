<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'role_id',
        'name',
        'email',
        'phone',
        'password',
        'status',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
    ];

    public function branches(): BelongsToMany
    {
        return $this->belongsToMany(Branch::class)
            ->withPivot('role_id')
            ->withTimestamps();
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function hasRole(string $roleName): bool
    {
        return $this->role?->name === $roleName;
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }

    public function workspace(): ?string
    {
        return session('workspace');
    }

    public function activeBranchId(): ?int
    {
        $branchId = (int) session('active_branch_id', 0);

        return $branchId > 0 ? $branchId : null;
    }

    public function activeBranch(): ?Branch
    {
        $branchId = $this->activeBranchId();

        return $branchId ? Branch::query()->find($branchId) : null;
    }

    public function branchRole(int $branchId): ?Role
    {
        if ($this->isSuperAdmin()) {
            return $this->role;
        }

        $roleId = $this->branches()
            ->whereKey($branchId)
            ->value('branch_user.role_id');

        return $roleId ? Role::query()->with('permissions')->find($roleId) : null;
    }

    public function activeRole(): ?Role
    {
        if ($this->workspace() === 'branch' && $this->activeBranchId()) {
            return $this->branchRole($this->activeBranchId());
        }

        return $this->role?->scope === 'global' ? $this->role : null;
    }

    public function hasPermission(string $permissionKey): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $role = $this->activeRole();
        $role?->loadMissing('permissions');

        return $role?->permissions?->contains('key', $permissionKey) ?? false;
    }

    public function canAccessGlobalWorkspace(): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if ($this->role?->scope !== 'global') {
            return false;
        }

        $this->loadMissing('role.permissions');

        return $this->role?->permissions?->isNotEmpty() ?? false;
    }

    public function canViewAllBranches(): bool
    {
        if ($this->workspace() === 'branch') {
            return false;
        }

        return $this->isSuperAdmin()
            || $this->hasPermission('branches.view_all')
            || $this->hasPermission('reports.global');
    }

    /**
     * @return array<int, int>
     */
    public function accessibleBranchIds(): array
    {
        if ($this->workspace() === 'branch') {
            $branchId = $this->activeBranchId();

            return $branchId && $this->canSelectBranch($branchId) ? [$branchId] : [];
        }

        if ($this->isSuperAdmin()) {
            return Branch::query()
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        if ($this->relationLoaded('branches')) {
            return $this->branches
                ->filter(fn ($branch) => !empty($branch->pivot?->role_id))
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        return $this->branches()
            ->whereNotNull('branch_user.role_id')
            ->pluck('branches.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    public function canAccessBranch(int $branchId): bool
    {
        if ($this->workspace() === 'branch') {
            return $this->activeBranchId() === $branchId && $this->canSelectBranch($branchId);
        }

        return $this->canSelectBranch($branchId);
    }

    public function canSelectBranch(int $branchId): bool
    {
        return $this->isSuperAdmin()
            || $this->branches()
                ->whereKey($branchId)
                ->whereNotNull('branch_user.role_id')
                ->exists();
    }

    public function soleBranchId(): ?int
    {
        $branchIds = $this->accessibleBranchIds();

        return count($branchIds) === 1 ? $branchIds[0] : null;
    }
}
