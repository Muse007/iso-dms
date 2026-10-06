<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('audit_findings', function (Blueprint $table) {
            // Auditor (the one who raised the finding) — used for the auditor-verification step.
            $table->foreignId('auditor_id')->nullable()->after('finding_owner_id')->constrained('users')->nullOnDelete();

            // Root cause as a list (minimal 3, maksimal 5) for Minor/Major.
            $table->json('root_causes')->nullable()->after('root_cause');

            // Preventive action (Minor/Major) + its own image evidence (boleh > 1).
            $table->text('preventive_action')->nullable()->after('corrective_action');
            $table->json('preventive_action_evidence_files')->nullable()->after('action_evidence_files');

            // Auditor-verification stage (before lead-auditor verification).
            $table->timestamp('auditor_verified_at')->nullable()->after('approval_note');
            $table->text('auditor_verification_note')->nullable()->after('auditor_verified_at');
        });

        // Insert 'waiting_auditor_verification' between approval and (lead) verification.
        DB::statement("ALTER TABLE audit_findings MODIFY COLUMN status ENUM('open','in_progress','waiting_approval','waiting_auditor_verification','waiting_verification','closed','rejected') NOT NULL DEFAULT 'open'");
    }

    public function down(): void
    {
        DB::statement("UPDATE audit_findings SET status = 'waiting_verification' WHERE status = 'waiting_auditor_verification'");
        DB::statement("ALTER TABLE audit_findings MODIFY COLUMN status ENUM('open','in_progress','waiting_approval','waiting_verification','closed','rejected') NOT NULL DEFAULT 'open'");

        Schema::table('audit_findings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('auditor_id');
            $table->dropColumn([
                'root_causes', 'preventive_action', 'preventive_action_evidence_files',
                'auditor_verified_at', 'auditor_verification_note',
            ]);
        });
    }
};
