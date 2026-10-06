<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('risks', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('title');
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->enum('category', ['operational', 'compliance', 'safety', 'environment', 'quality', 'financial', 'reputation', 'strategic'])->default('operational');
            $table->text('context')->nullable();
            $table->text('cause')->nullable();
            $table->text('impact')->nullable();
            $table->unsignedTinyInteger('severity')->default(3);
            $table->unsignedTinyInteger('likelihood')->default(3);
            $table->unsignedSmallInteger('score')->default(9);
            $table->enum('level', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->text('treatment_plan')->nullable();
            $table->unsignedTinyInteger('residual_severity')->nullable();
            $table->unsignedTinyInteger('residual_likelihood')->nullable();
            $table->unsignedSmallInteger('residual_score')->nullable();
            $table->enum('status', ['identified', 'assessed', 'treating', 'monitoring', 'closed'])->default('identified');
            $table->date('review_date')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['level', 'status']);
            $table->index('score');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('risks');
    }
};
