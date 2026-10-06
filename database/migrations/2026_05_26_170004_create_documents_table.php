<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('code', 64)->unique();
            $table->string('title');
            $table->enum('type', ['policy', 'manual', 'sop', 'work_instruction', 'form', 'record', 'other'])->default('sop');
            $table->enum('standard', ['iso_9001', 'iso_14001', 'iso_45001', 'iatf', 'internal'])->default('iso_9001');
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['draft', 'in_review', 'approved', 'published', 'obsolete', 'withdrawn', 'rejected'])->default('draft');
            $table->date('effective_date')->nullable();
            $table->date('next_review_date')->nullable();
            $table->string('current_revision', 16)->default('1.0');
            $table->text('description')->nullable();
            $table->json('distribution_list')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'department_id']);
            $table->index(['type', 'standard']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
