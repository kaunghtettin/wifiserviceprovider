<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

trait BranchScoped
{
    public static function bootBranchScoped()
    {
        static::creating(function ($model) {
            $user = auth()->user();
            if (!$user) {
                return;
            }

            if ($user->canViewAllBranches()) {
                return;
            }

            $branchId = $user->soleBranchId();
            if ($branchId && empty($model->branch_id)) {
                $model->branch_id = $branchId;
            }
        });

        static::addGlobalScope('branch', function (Builder $builder) {
            $user = auth()->user();
            if (!$user) {
                return;
            }

            if ($user->canViewAllBranches()) {
                return;
            }

            $builder->whereIn(
                $builder->getModel()->getTable().'.branch_id',
                $user->accessibleBranchIds()
            );
        });
    }
}
