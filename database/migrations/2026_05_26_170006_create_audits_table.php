<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('audits', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('title');
            $table->enum('standard', ['iso_9001', 'iso_14001', 'iso_45001', 'iatf', 'internal'])->default('iso_9001');
            $table->enum('type', ['internal', 'external', 'surveillance', 'recertification'])->default('internal');
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('lead_auditor_id')->constrained('users')->cascadeOnDelete();
            $table->json('team')->nullable();
            $table->date('planned_date');
            $table->date('actual_start_date')->nullable();
            $table->date('actual_end_date')->nullable();
            $table->enum('status', ['planned', 'scheduled', 'in_progress', 'reporting', 'closed', 'cancelled'])->default('planned');
            $table->text('scope')->nullable();
            $table->text('objectives')->nullable();
            $table->text('summary')->nullable();
            $table->string('report_path')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'standard']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audits');
    }
};
