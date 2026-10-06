<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('audit_schedules', function (Blueprint $table) {
            $table->string('opening_location')->nullable()->after('opening_at');
            $table->string('closing_location')->nullable()->after('closing_at');
            $table->json('audit_categories')->nullable()->after('closing_location'); // sistem | proses | produk
        });
    }

    public function down(): void
    {
        Schema::table('audit_schedules', function (Blueprint $table) {
            $table->dropColumn(['opening_location', 'closing_location', 'audit_categories']);
        });
    }
};
