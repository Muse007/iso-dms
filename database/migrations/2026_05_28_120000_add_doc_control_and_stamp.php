<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('stamp_path')->nullable()->after('signature_path');
            $table->string('address', 500)->nullable()->after('phone');
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->foreignId('document_control_user_id')->nullable()->after('approved_by_user_id')->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('document_control_user_id');
            $table->timestamp('approved_at')->nullable()->after('reviewed_at');
            $table->timestamp('doc_control_approved_at')->nullable()->after('approved_at');
        });

        // Create document_control role (idempotent).
        $role = Role::firstOrCreate(['name' => 'document_control', 'guard_name' => 'web']);

        // Grant document-related approval permissions to the new role.
        $permNames = DB::table('permissions')
            ->where('name', 'like', 'document%')
            ->orWhere('name', 'like', 'approvals%')
            ->pluck('name')
            ->all();
        if (!empty($permNames)) {
            $role->syncPermissions($permNames);
        }

        // Seed a Document Control user if missing.
        if (!DB::table('users')->where('email', 'dc@iso-dms.test')->exists()) {
            $userId = DB::table('users')->insertGetId([
                'name'              => 'Document Control',
                'email'             => 'dc@iso-dms.test',
                'password'          => Hash::make('password'),
                'position'          => 'Document Controller',
                'status'            => 'active',
                'email_verified_at' => now(),
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);
            DB::table('model_has_roles')->insert([
                'role_id'    => $role->id,
                'model_type' => 'App\\Models\\User',
                'model_id'   => $userId,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign(['document_control_user_id']);
            $table->dropColumn(['document_control_user_id', 'reviewed_at', 'approved_at', 'doc_control_approved_at']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['stamp_path', 'address']);
        });
    }
};
