<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Clauses grouped per ISO standard, e.g. {"iso_9001":["7.5.3","8.5.1"]}.
            // Auto-rendered into section "C. Acuan" of the SOP report.
            $table->json('iso_clauses')->nullable()->after('references_list');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('iso_clauses');
        });
    }
};
