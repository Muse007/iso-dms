<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('audits', function (Blueprint $table) {
            // FM-BDK-007 schedule fields. One "schedule event" (period + lead auditor)
            // contains many bagian rows; each bagian row is one Audit sharing schedule_group.
            $table->string('schedule_group', 64)->nullable()->after('code')->index();
            $table->string('period_label')->nullable()->after('title');     // e.g. "SEMESTER 2 Tahun 2025"
            $table->string('jam_pelaksanaan', 64)->nullable()->after('planned_date'); // e.g. "08.30 - 12.00"
            // Proses + Related Document rows for this bagian: [{ proses, related_documents }]
            $table->json('processes')->nullable()->after('objectives');
        });
    }

    public function down(): void
    {
        Schema::table('audits', function (Blueprint $table) {
            $table->dropColumn(['schedule_group', 'period_label', 'jam_pelaksanaan', 'processes']);
        });
    }
};
