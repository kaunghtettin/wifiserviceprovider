<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Admin\BranchController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\WifiPackageController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\RoleController;
use Illuminate\Foundation\Application;
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

Route::prefix('admin')->name('admin.')->group(function () {
    Route::middleware('guest')->group(function () {
        Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
        Route::post('/login', [AuthenticatedSessionController::class, 'store']);
    });

    Route::middleware('auth')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

        Route::get('/', function () {
            return Inertia::render('Dashboard');
        })->name('home');

        Route::get('/ui-showcase', function () {
            return Inertia::render('UiShowcase');
        })->name('ui-showcase');

        Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

        Route::middleware('permission:branches.manage')->group(function () {
            Route::get('/branches', [BranchController::class, 'index'])->name('branches.index');
            Route::post('/branches', [BranchController::class, 'store'])->name('branches.store');
            Route::put('/branches/{branch}', [BranchController::class, 'update'])->name('branches.update');
            Route::delete('/branches/{branch}', [BranchController::class, 'destroy'])->name('branches.destroy');
        });

        Route::middleware('permission:customers.manage')->group(function () {
            Route::get('/customers', [CustomerController::class, 'index'])->name('customers.index');
            Route::get('/customers/create', [CustomerController::class, 'create'])->name('customers.create');
            Route::get('/customers/{customer}/edit', [CustomerController::class, 'edit'])->name('customers.edit');
            Route::post('/customers', [CustomerController::class, 'store'])->name('customers.store');
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
            Route::get('/invoices', fn () => Inertia::render('Placeholder', ['title' => 'Invoices', 'description' => 'Monthly invoice generation and management will be implemented next.']))->name('invoices.index');
        });

        Route::middleware('permission:payments.manage')->group(function () {
            Route::get('/payments', fn () => Inertia::render('Placeholder', ['title' => 'Payments', 'description' => 'Payments and receipt workflows will be implemented next.']))->name('payments.index');
        });

        Route::middleware('permission:expenses.manage')->group(function () {
            Route::get('/expenses', fn () => Inertia::render('Placeholder', ['title' => 'Expenses', 'description' => 'Expense tracking will be implemented next.']))->name('expenses.index');
        });

        Route::middleware('permission:notifications.manage')->group(function () {
            Route::get('/notifications', fn () => Inertia::render('Placeholder', ['title' => 'Notifications', 'description' => 'Internal notification center will be implemented next.']))->name('notifications.index');
        });

        Route::middleware('permission:sms.manage')->group(function () {
            Route::get('/sms', fn () => Inertia::render('Placeholder', ['title' => 'SMS', 'description' => 'SMS gateway integration and logs will be implemented next.']))->name('sms.index');
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

        Route::middleware('permission:dashboard.view')->group(function () {
            Route::get('/reports', fn () => Inertia::render('Placeholder', ['title' => 'Reports', 'description' => 'Analytics and reporting dashboards will be implemented next.']))->name('reports.index');
        });

        Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
        Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    });
});

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => true,
        'canRegister' => false,
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});
