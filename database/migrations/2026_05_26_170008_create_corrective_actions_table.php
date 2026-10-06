<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('corrective_actions', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->enum('kind', ['ncr', 'car', 'capa'])->default('ncr');
            $table->enum('source', ['internal_audit', 'external_audit', 'customer_complaint', 'kpi_miss', 'inspection', 'employee_report', 'other'])->default('internal_audit');
            $table->nullableMorphs('source_ref');
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('raised_by_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('problem_statement');
            $table->text('immediate_action')->nullable();
            $table->text('root_cause')->nullable();
            $table->text('corrective_action')->nullable();
            $table->text('preventive_action')->nullable();
            $table->text('verification_result')->nullable();
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('status', ['open', 'assigned', 'in_progress', 'verification', 'closed_effective', 'closed_ineffective', 'rejected'])->default('open');
            $table->date('due_date')->nullable();
            $table->date('closed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'kind']);
            $table->index(['owner_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('corrective_actions');
    }
};
