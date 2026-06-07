<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

trait BranchScoped
{
    public static function bootBranchScoped()
    {
        static::creating(function ($model) {
            $user = auth()->user();
            if (!$user || $user->workspace() !== 'branch') {
                return;
            }

            $branchId = $user->activeBranchId();
            if ($branchId) {
                $model->branch_id = $branchId;
            }
        });

        static::addGlobalScope('branch', function (Builder $builder) {
            $user = auth()->user();
            if (!$user || $user->workspace() !== 'branch') {
                return;
            }

            $builder->where(
                $builder->getModel()->getTable().'.branch_id',
                $user->activeBranchId() ?: 0
            );
        });
    }
}
