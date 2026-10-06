<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_finding_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_finding_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            // submitted, approved, revision_requested, rejected, auditor_verified, lead_verified
            $table->string('action');
            // asal aksi: auditee, atasan, auditor, lead
            $table->string('stage')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['audit_finding_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_finding_events');
    }
};
