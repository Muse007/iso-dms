<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('approvals', function (Blueprint $table) {
            $table->id();
            $table->morphs('approvable');
            $table->unsignedSmallInteger('level');
            $table->string('role_required')->nullable();
            $table->foreignId('approver_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['pending', 'approved', 'rejected', 'revision', 'skipped'])->default('pending');
            $table->text('comment')->nullable();
            $table->string('signature_path')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamp('escalated_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'level']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approvals');
    }
};
