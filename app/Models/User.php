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
        return $this->belongsToMany(Branch::class)->withTimestamps();
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function hasRole(string $roleName): bool
    {
        return $this->role?->name === $roleName;
    }

    public function hasPermission(string $permissionKey): bool
    {
        if ($this->hasRole('super_admin')) {
            return true;
        }

        $this->loadMissing('role.permissions');

        return $this->role?->permissions?->contains('key', $permissionKey) ?? false;
    }

    public function canViewAllBranches(): bool
    {
        return $this->hasRole('super_admin') || $this->hasPermission('branches.view_all');
    }

    /**
     * @return array<int, int>
     */
    public function accessibleBranchIds(): array
    {
        if ($this->relationLoaded('branches')) {
            return $this->branches
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        return $this->branches()
            ->pluck('branches.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    public function canAccessBranch(int $branchId): bool
    {
        return $this->canViewAllBranches()
            || in_array($branchId, $this->accessibleBranchIds(), true);
    }

    public function soleBranchId(): ?int
    {
        $branchIds = $this->accessibleBranchIds();

        return count($branchIds) === 1 ? $branchIds[0] : null;
    }
}
