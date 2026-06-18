<?php

namespace App\Models;

use App\Models\Concerns\BranchScoped;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use BranchScoped, HasFactory;

    protected $fillable = [
        'customer_code',
        'branch_id',
        'wifi_package_id',
        'name',
        'ftth_account_name',
        'ftth_id',
        'phone',
        'nrc',
        'address',
        'gps_lat',
        'gps_lng',
        'installation_date',
        'billing_day_of_month',
        'router_sn',
        'status',
        'notes',
        'created_by_user_id',
    ];

    protected $casts = [
        'gps_lat' => 'decimal:7',
        'gps_lng' => 'decimal:7',
        'installation_date' => 'date',
        'billing_day_of_month' => 'integer',
    ];

    protected static function booted()
    {
        static::created(function (Customer $customer) {
            if ($customer->customer_code) {
                return;
            }

            $customer->forceFill([
                'customer_code' => 'C'.str_pad((string) $customer->id, 6, '0', STR_PAD_LEFT),
            ])->save();
        });
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(WifiPackage::class, 'wifi_package_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
