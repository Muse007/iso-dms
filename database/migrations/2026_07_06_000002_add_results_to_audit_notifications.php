<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('audit_notifications', function (Blueprint $table) {
            $table->json('results')->nullable()->after('error');
        });
    }

    public function down(): void
    {
        Schema::table('audit_notifications', function (Blueprint $table) {
            $table->dropColumn('results');
        });
    }
};
