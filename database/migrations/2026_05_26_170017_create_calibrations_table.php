<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('calibrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained()->cascadeOnDelete();
            $table->string('certificate_no', 64)->nullable();
            $table->enum('type', ['internal', 'external'])->default('external');
            $table->string('vendor')->nullable();
            $table->date('calibration_date');
            $table->date('next_due_date');
            $table->enum('result', ['pass', 'fail', 'adjusted'])->default('pass');
            $table->string('certificate_path')->nullable();
            $table->text('remark')->nullable();
            $table->foreignId('performed_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['asset_id', 'calibration_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calibrations');
    }
};
