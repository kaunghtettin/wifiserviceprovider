<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class InitialSetupSeeder extends Seeder
{
    public function run()
    {
        $defaultBranch = Branch::firstOrCreate(
            ['name' => 'Main Branch'],
            ['code' => 'MAIN']
        );

        $roles = [
            'super_admin' => 'Full system access',
            'admin' => 'Branch-level management',
            'staff' => 'Limited access',
        ];

        foreach ($roles as $name => $description) {
            Role::firstOrCreate(['name' => $name], ['description' => $description]);
        }

        $permissions = [
            ['key' => 'dashboard.view', 'description' => 'View dashboard'],
            ['key' => 'branches.manage', 'description' => 'Manage branches (create/update/delete)'],
            ['key' => 'branches.view_all', 'description' => 'View all branches (cross-branch access)'],
            ['key' => 'users.manage', 'description' => 'Manage users (create/update/disable/delete)'],
            ['key' => 'roles.manage', 'description' => 'Manage roles & permissions (RBAC)'],
            ['key' => 'customers.manage', 'description' => 'Manage customers'],
            ['key' => 'packages.manage', 'description' => 'Manage WiFi packages'],
            ['key' => 'invoices.manage', 'description' => 'Manage invoices'],
            ['key' => 'payments.manage', 'description' => 'Manage payments & receipts'],
            ['key' => 'expenses.manage', 'description' => 'Manage expenses'],
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['key' => $permission['key']], ['description' => $permission['description']]);
        }

        $admin = Role::where('name', 'admin')->first();
        $staff = Role::where('name', 'staff')->first();

        $adminPermissionKeys = [
            'dashboard.view',
            'users.manage',
            'customers.manage',
            'packages.manage',
            'invoices.manage',
            'payments.manage',
            'expenses.manage',
        ];

        $staffPermissionKeys = [
            'dashboard.view',
            'customers.manage',
            'payments.manage',
        ];

        if ($admin) {
            $adminPermissions = Permission::whereIn('key', $adminPermissionKeys)->pluck('id');
            $admin->permissions()->syncWithoutDetaching($adminPermissions);
        }

        if ($staff) {
            $staffPermissions = Permission::whereIn('key', $staffPermissionKeys)->pluck('id');
            $staff->permissions()->syncWithoutDetaching($staffPermissions);
        }

        $superAdminRole = Role::where('name', 'super_admin')->first();
        $superAdminEmail = env('SUPER_ADMIN_EMAIL', 'superadmin@localhost');
        $superAdminName = env('SUPER_ADMIN_NAME', 'Super Admin');
        $superAdminPassword = env('SUPER_ADMIN_PASSWORD');

        if (!$superAdminPassword) {
            if (app()->environment('local')) {
                $superAdminPassword = 'password';
                if (isset($this->command)) {
                    $this->command->warn('SUPER_ADMIN_PASSWORD is not set. Using default local password: password');
                    $this->command->warn('Set SUPER_ADMIN_PASSWORD in .env for a custom password.');
                }
            } else {
                throw new \RuntimeException('SUPER_ADMIN_PASSWORD must be set in non-local environments.');
            }
        }

        $superAdminUser = User::firstOrNew(['email' => $superAdminEmail]);
        $superAdminUser->name = $superAdminName;
        $superAdminUser->password = Hash::make($superAdminPassword);
        $superAdminUser->branch_id = $defaultBranch->id;
        $superAdminUser->role_id = $superAdminRole?->id;
        $superAdminUser->status = 'active';
        $superAdminUser->email_verified_at = now();
        $superAdminUser->save();

        $firstUser = User::orderBy('id')->first();
        if ($firstUser) {
            if (!$firstUser->branch_id) {
                $firstUser->branch_id = $defaultBranch->id;
            }
            if (!$firstUser->role_id && $superAdminRole) {
                $firstUser->role_id = $superAdminRole->id;
            }
            $firstUser->save();
        }

        $defaultRole = $staff ?: $admin ?: $superAdminRole;
        if ($defaultRole) {
            User::whereNull('branch_id')->update(['branch_id' => $defaultBranch->id]);
            User::whereNull('role_id')->update(['role_id' => $defaultRole->id]);
        }
    }
}
