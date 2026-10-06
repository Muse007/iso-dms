<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('trainings', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('title');
            $table->enum('type', ['internal', 'external', 'online', 'on_job'])->default('internal');
            $table->enum('category', ['iso', 'safety', 'technical', 'softskill', 'leadership', 'other'])->default('iso');
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->string('trainer')->nullable();
            $table->string('venue')->nullable();
            $table->date('scheduled_date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->unsignedSmallInteger('duration_hours')->default(0);
            $table->enum('status', ['planned', 'scheduled', 'ongoing', 'completed', 'cancelled'])->default('planned');
            $table->text('objectives')->nullable();
            $table->string('material_path')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'scheduled_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trainings');
    }
};
