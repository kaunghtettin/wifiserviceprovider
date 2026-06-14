<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Admin\BranchController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\WifiPackageController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\ExpenseController;
use App\Http\Controllers\Admin\ExpenseCategoryController;
use App\Http\Controllers\Admin\InvoiceController;
use App\Http\Controllers\Admin\OverdueTrackingController;
use App\Http\Controllers\Admin\PaymentController;
use App\Http\Controllers\Admin\PerformanceController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\WorkspaceController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::name('admin.')->group(function () {
    Route::middleware('guest')->group(function () {
        Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
        Route::post('/login', [AuthenticatedSessionController::class, 'store']);
    });

    Route::middleware('auth')->group(function () {
        Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

        Route::get('/workspaces', [WorkspaceController::class, 'index'])->name('workspaces.index');
        Route::post('/workspaces/branches/{branch}', [WorkspaceController::class, 'selectBranch'])->name('workspaces.branches.select');
        Route::post('/workspaces/global', [WorkspaceController::class, 'selectGlobal'])->name('workspaces.global.select');
        Route::post('/workspaces/switch', [WorkspaceController::class, 'switch'])->name('workspaces.switch');

        Route::middleware('workspace.branch')->group(function () {
            Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

            Route::middleware('permission:customers.manage')->group(function () {
                Route::get('/customers', [CustomerController::class, 'index'])->name('customers.index');
                Route::get('/overdue-tracking', [OverdueTrackingController::class, 'index'])->name('overdue-tracking.index');
                Route::post('/overdue-tracking/status', [OverdueTrackingController::class, 'bulkUpdateStatus'])->name('overdue-tracking.status.bulk');
                Route::post('/overdue-tracking/{customer}/status', [OverdueTrackingController::class, 'updateStatus'])->name('overdue-tracking.status');
                Route::post('/overdue-tracking/{customer}/suspend', [OverdueTrackingController::class, 'suspend'])->name('overdue-tracking.suspend');
                Route::get('/customers/create', [CustomerController::class, 'create'])->name('customers.create');
                Route::get('/customers/{customer}', [CustomerController::class, 'show'])->name('customers.show');
                Route::get('/customers/{customer}/edit', [CustomerController::class, 'edit'])->name('customers.edit');
                Route::post('/customers', [CustomerController::class, 'store'])->name('customers.store');
                Route::post('/customers/{customer}/invoices', [CustomerController::class, 'generateInvoice'])->name('customers.invoices.store');
                Route::post('/customers/{customer}/payments', [CustomerController::class, 'recordPayment'])->name('customers.payments.store');
                Route::put('/customers/{customer}', [CustomerController::class, 'update'])->name('customers.update');
                Route::delete('/customers/{customer}', [CustomerController::class, 'destroy'])->name('customers.destroy');
            });

            Route::middleware('permission:packages.manage')->group(function () {
                Route::get('/packages', [WifiPackageController::class, 'index'])->name('packages.index');
                Route::post('/packages', [WifiPackageController::class, 'store'])->name('packages.store');
                Route::put('/packages/{package}', [WifiPackageController::class, 'update'])->name('packages.update');
                Route::delete('/packages/{package}', [WifiPackageController::class, 'destroy'])->name('packages.destroy');
            });

            Route::middleware('permission:invoices.manage')->group(function () {
                Route::get('/invoices', [InvoiceController::class, 'index'])->name('invoices.index');
                Route::post('/invoices', [InvoiceController::class, 'store'])->name('invoices.store');
                Route::get('/invoices/{invoice}/print', [InvoiceController::class, 'print'])->name('invoices.print');
            });

            Route::middleware('permission:payments.manage')->group(function () {
                Route::get('/payments', [PaymentController::class, 'index'])->name('payments.index');
                Route::post('/payments', [PaymentController::class, 'store'])->name('payments.store');
                Route::get('/payments/{payment}/receipt', [PaymentController::class, 'receipt'])->name('payments.receipt');
            });

            Route::middleware('permission:expenses.manage')->group(function () {
                Route::get('/expenses', [ExpenseController::class, 'index'])->name('expenses.index');
                Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');
                Route::put('/expenses/{expense}', [ExpenseController::class, 'update'])->name('expenses.update');
                Route::delete('/expenses/{expense}', [ExpenseController::class, 'destroy'])->name('expenses.destroy');
                Route::get('/expense-categories', [ExpenseCategoryController::class, 'index'])->name('expense-categories.index');
                Route::post('/expense-categories', [ExpenseCategoryController::class, 'store'])->name('expense-categories.store');
                Route::put('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'update'])->name('expense-categories.update');
                Route::delete('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'destroy'])->name('expense-categories.destroy');
            });

            Route::middleware('permission:dashboard.view')->group(function () {
                Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
            });
        });

        Route::middleware('workspace.global')->group(function () {
            Route::middleware('permission:reports.global')
                ->get('/global-summary', [PerformanceController::class, 'index'])
                ->name('global-summary.index');

            Route::middleware('permission:branches.manage')->group(function () {
                Route::get('/branches', [BranchController::class, 'index'])->name('branches.index');
                Route::post('/branches', [BranchController::class, 'store'])->name('branches.store');
                Route::put('/branches/{branch}', [BranchController::class, 'update'])->name('branches.update');
                Route::delete('/branches/{branch}', [BranchController::class, 'destroy'])->name('branches.destroy');
            });

            Route::middleware('permission:users.manage')->group(function () {
                Route::get('/users', [UserController::class, 'index'])->name('users.index');
                Route::post('/users', [UserController::class, 'store'])->name('users.store');
                Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
                Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
            });

            Route::middleware('permission:roles.manage')->group(function () {
                Route::get('/roles', [RoleController::class, 'index'])->name('roles.index');
                Route::post('/roles', [RoleController::class, 'store'])->name('roles.store');
                Route::put('/roles/{role}', [RoleController::class, 'update'])->name('roles.update');
                Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');
            });

            Route::get('/ui-showcase', function () {
                return Inertia::render('UiShowcase');
            })->middleware('permission:roles.manage')->name('ui-showcase');
        });

        Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
        Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::put('/password', [PasswordController::class, 'update'])->name('password.update');
        Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    });
});

Route::get('/', [AuthenticatedSessionController::class, 'create']);
