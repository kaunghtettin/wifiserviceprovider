<?php

namespace App\Models;

use App\Models\Concerns\BranchScoped;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use BranchScoped, HasFactory;

    protected $fillable = [
        'payment_code',
        'branch_id',
        'invoice_id',
        'customer_id',
        'amount',
        'paid_at',
        'method',
        'reference_no',
        'notes',
        'received_by_user_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::created(function (Payment $payment) {
            if ($payment->payment_code) {
                return;
            }

            $payment->forceFill([
                'payment_code' => 'PAY'.str_pad((string) $payment->id, 7, '0', STR_PAD_LEFT),
            ])->saveQuietly();
        });
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by_user_id');
    }
}
