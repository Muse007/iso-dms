<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('audit_schedules', function (Blueprint $table) {
            $table->id();
            $table->string('code', 64)->unique();          // = schedule_group, e.g. SA-2025-001
            $table->string('period_label')->nullable();
            $table->string('standard', 32)->default('iso_9001'); // primary/legacy
            $table->json('standards')->nullable();               // multi-standard (checklist)
            $table->string('type', 32)->default('internal');
            $table->foreignId('lead_auditor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('scope')->nullable();
            $table->text('objectives')->nullable();

            // Workflow: pending_review (after submit) → approved (MR sign) → shared (DC email).
            $table->enum('status', ['pending_review', 'approved', 'shared', 'rejected'])->default('pending_review');

            $table->foreignId('mr_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('mr_signed_at')->nullable();
            $table->text('mr_note')->nullable();

            $table->foreignId('shared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('shared_at')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_schedules');
    }
};
