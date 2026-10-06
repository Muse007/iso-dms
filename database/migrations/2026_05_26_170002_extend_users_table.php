<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->after('email')->constrained('departments')->nullOnDelete();
            $table->string('employee_no', 32)->nullable()->after('department_id')->unique();
            $table->string('position')->nullable()->after('employee_no');
            $table->string('phone', 32)->nullable()->after('position');
            $table->string('avatar_path')->nullable()->after('phone');
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active')->after('avatar_path');
            $table->timestamp('last_login_at')->nullable()->after('status');
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('department_id');
            $table->dropColumn(['employee_no', 'position', 'phone', 'avatar_path', 'status', 'last_login_at', 'deleted_at']);
        });
    }
};
