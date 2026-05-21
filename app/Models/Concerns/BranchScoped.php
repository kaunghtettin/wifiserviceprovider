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

            if ($user->hasRole('super_admin') || $user->hasPermission('branches.view_all')) {
                return;
            }

            if ($user->branch_id && empty($model->branch_id)) {
                $model->branch_id = $user->branch_id;
            }
        });

        static::addGlobalScope('branch', function (Builder $builder) {
            $user = auth()->user();
            if (!$user) {
                return;
            }

            if ($user->hasRole('super_admin') || $user->hasPermission('branches.view_all')) {
                return;
            }

            if (!$user->branch_id) {
                return;
            }

            $builder->where($builder->getModel()->getTable().'.branch_id', $user->branch_id);
        });
    }
}

