<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('kpi_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kpi_id')->constrained()->cascadeOnDelete();
            $table->date('period');
            $table->decimal('actual', 14, 2);
            $table->decimal('target_snapshot', 14, 2)->nullable();
            $table->decimal('achievement_pct', 6, 2)->nullable();
            $table->enum('status', ['green', 'amber', 'red'])->default('green');
            $table->text('note')->nullable();
            $table->foreignId('recorded_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['kpi_id', 'period']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kpi_records');
    }
};
