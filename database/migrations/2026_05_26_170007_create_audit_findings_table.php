<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('audit_findings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_id')->constrained()->cascadeOnDelete();
            $table->string('reference', 64)->nullable();
            $table->enum('category', ['major_nc', 'minor_nc', 'observation', 'opportunity'])->default('minor_nc');
            $table->string('clause', 32)->nullable();
            $table->text('description');
            $table->text('evidence')->nullable();
            $table->foreignId('finding_owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['open', 'in_action', 'closed'])->default('open');
            $table->date('due_date')->nullable();
            $table->timestamps();

            $table->index(['audit_id', 'status']);
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_findings');
    }
};
