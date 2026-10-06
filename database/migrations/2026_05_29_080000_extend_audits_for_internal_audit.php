<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('audits', function (Blueprint $table) {
            $table->string('location')->nullable()->after('department_id');
            $table->json('auditees')->nullable()->after('team');
            $table->json('cc_user_ids')->nullable()->after('auditees');
            $table->timestamp('notified_at')->nullable()->after('status');
        });

        // Widen audit_findings status enum and add CA workflow fields.
        Schema::table('audit_findings', function (Blueprint $table) {
            $table->text('root_cause')->nullable()->after('description');
            $table->text('corrective_action')->nullable()->after('root_cause');
            $table->json('evidence_files')->nullable()->after('evidence');
            $table->json('action_evidence_files')->nullable()->after('evidence_files');
            $table->foreignId('approver_id')->nullable()->after('finding_owner_id')->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('approval_note')->nullable();
            $table->foreignId('verifier_id')->nullable()->after('approver_id')->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('verification_note')->nullable();
            $table->timestamp('closed_at')->nullable();
        });

        // Rename legacy in_action → in_progress, widen enum.
        DB::statement("UPDATE audit_findings SET status = 'in_progress' WHERE status = 'in_action'");
        DB::statement("ALTER TABLE audit_findings MODIFY COLUMN status ENUM('open','in_progress','waiting_approval','waiting_verification','closed','rejected') NOT NULL DEFAULT 'open'");
    }

    public function down(): void
    {
        DB::statement("UPDATE audit_findings SET status = 'in_action' WHERE status IN ('in_progress','waiting_approval','waiting_verification','rejected')");
        DB::statement("ALTER TABLE audit_findings MODIFY COLUMN status ENUM('open','in_action','closed') NOT NULL DEFAULT 'open'");

        Schema::table('audit_findings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('approver_id');
            $table->dropConstrainedForeignId('verifier_id');
            $table->dropColumn([
                'root_cause', 'corrective_action', 'evidence_files', 'action_evidence_files',
                'submitted_at', 'approved_at', 'approval_note',
                'verified_at', 'verification_note', 'closed_at',
            ]);
        });

        Schema::table('audits', function (Blueprint $table) {
            $table->dropColumn(['location', 'auditees', 'cc_user_ids', 'notified_at']);
        });
    }
};
