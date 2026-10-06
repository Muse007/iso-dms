<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Auditor aktual — realisasi pelaksanaan, terpisah dari auditor yang
     * direncanakan di jadwal FM-BDK-007. Jadwal yang sudah di-approve MR tidak
     * boleh berubah isinya, jadi penggantian auditor di lapangan dicatat di
     * kolom tersendiri. Pola yang sama dengan planned_date vs actual_start_date.
     */
    public function up(): void
    {
        Schema::table('audits', function (Blueprint $table) {
            $table->foreignId('actual_lead_auditor_id')->nullable()->after('lead_auditor_id')
                ->constrained('users')->nullOnDelete();
            $table->json('actual_team')->nullable()->after('team');
            $table->text('auditor_change_reason')->nullable()->after('actual_team');
            $table->timestamp('auditor_changed_at')->nullable()->after('auditor_change_reason');
            $table->foreignId('auditor_changed_by')->nullable()->after('auditor_changed_at')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('audits', function (Blueprint $table) {
            $table->dropConstrainedForeignId('actual_lead_auditor_id');
            $table->dropConstrainedForeignId('auditor_changed_by');
            $table->dropColumn(['actual_team', 'auditor_change_reason', 'auditor_changed_at']);
        });
    }
};
