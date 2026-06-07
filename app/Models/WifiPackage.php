<?php

namespace App\Models;

use App\Models\Concerns\BranchScoped;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WifiPackage extends Model
{
    use BranchScoped, HasFactory;

    protected $fillable = [
        'branch_id',
        'name',
        'speed_mbps',
        'price',
        'duration_months',
        'description',
        'status',
    ];

    protected $casts = [
        'speed_mbps' => 'integer',
        'price' => 'decimal:2',
        'duration_months' => 'integer',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
