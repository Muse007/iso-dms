<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('training_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('attendance', ['invited', 'attended', 'absent', 'excused'])->default('invited');
            $table->decimal('pre_score', 5, 2)->nullable();
            $table->decimal('post_score', 5, 2)->nullable();
            $table->enum('result', ['pending', 'pass', 'fail'])->default('pending');
            $table->string('certificate_path')->nullable();
            $table->timestamps();

            $table->unique(['training_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_participants');
    }
};
