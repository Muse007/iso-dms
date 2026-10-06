<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('supplier_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            $table->date('period');
            $table->decimal('quality_score', 5, 2)->default(0);
            $table->decimal('delivery_score', 5, 2)->default(0);
            $table->decimal('price_score', 5, 2)->default(0);
            $table->decimal('service_score', 5, 2)->default(0);
            $table->decimal('total_score', 5, 2)->default(0);
            $table->enum('result', ['approved', 'conditional', 'rejected'])->default('conditional');
            $table->text('comment')->nullable();
            $table->foreignId('evaluated_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['supplier_id', 'period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_evaluations');
    }
};
