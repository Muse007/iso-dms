<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('audit_schedules', function (Blueprint $table) {
            $table->timestamp('opening_at')->nullable()->after('objectives');
            $table->timestamp('closing_at')->nullable()->after('opening_at');
        });
    }

    public function down(): void
    {
        Schema::table('audit_schedules', function (Blueprint $table) {
            $table->dropColumn(['opening_at', 'closing_at']);
        });
    }
};
