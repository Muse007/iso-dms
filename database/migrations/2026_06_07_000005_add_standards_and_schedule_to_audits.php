<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('audits', function (Blueprint $table) {
            $table->json('standards')->nullable()->after('standard');
            $table->foreignId('audit_schedule_id')->nullable()->after('schedule_group')
                ->constrained('audit_schedules')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('audits', function (Blueprint $table) {
            $table->dropConstrainedForeignId('audit_schedule_id');
            $table->dropColumn('standards');
        });
    }
};
