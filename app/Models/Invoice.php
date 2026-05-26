<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'branch_id',
        'customer_id',
        'wifi_package_id',
        'invoice_month',
        'due_date',
        'billing_day_of_month',
        'package_name',
        'package_price',
        'total_amount',
        'paid_amount',
        'balance_amount',
        'status',
        'last_payment_at',
        'notes',
        'generated_by_user_id',
    ];

    protected $casts = [
        'invoice_month' => 'date',
        'due_date' => 'date',
        'billing_day_of_month' => 'integer',
        'package_price' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance_amount' => 'decimal:2',
        'last_payment_at' => 'datetime',
    ];

    protected $appends = [
        'display_status',
        'days_left',
    ];

    protected static function booted()
    {
        static::created(function (Invoice $invoice) {
            if ($invoice->invoice_number) {
                return;
            }

            $invoice->forceFill([
                'invoice_number' => 'INV'.str_pad((string) $invoice->id, 7, '0', STR_PAD_LEFT),
            ])->saveQuietly();
        });
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(WifiPackage::class, 'wifi_package_id');
    }

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by_user_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function refreshPaymentState(): void
    {
        $paidAmount = (float) $this->payments()->sum('amount');
        $totalAmount = (float) $this->total_amount;
        $balanceAmount = max($totalAmount - $paidAmount, 0);
        $lastPaymentAt = $this->payments()->max('paid_at');

        $status = 'unpaid';
        if ($balanceAmount <= 0.00001) {
            $status = 'paid';
        } elseif ($paidAmount > 0) {
            $status = 'partial';
        }

        if ($balanceAmount > 0 && $this->due_date && $this->due_date->isPast()) {
            $status = 'overdue';
        }

        $this->forceFill([
            'paid_amount' => $paidAmount,
            'balance_amount' => $balanceAmount,
            'last_payment_at' => $lastPaymentAt,
            'status' => $status,
        ])->saveQuietly();
    }

    public function getDisplayStatusAttribute(): string
    {
        return $this->shouldShowWarning() ? 'warning' : (string) ($this->status ?: '-');
    }

    public function getDaysLeftAttribute(): ?int
    {
        if (!$this->due_date || !in_array((string) $this->status, ['unpaid', 'partial'], true)) {
            return null;
        }

        $today = now()->startOfDay();
        $dueDate = $this->due_date instanceof Carbon
            ? $this->due_date->copy()->startOfDay()
            : Carbon::parse($this->due_date)->startOfDay();
        $daysLeft = $today->diffInDays($dueDate, false);

        return $daysLeft >= 0 ? $daysLeft : null;
    }

    private function shouldShowWarning(): bool
    {
        $daysLeft = $this->days_left;

        return $daysLeft !== null && $daysLeft <= 7;
    }
}
