<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name');
            $table->string('serial_no', 64)->nullable();
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->string('location')->nullable();
            $table->string('measurement_range')->nullable();
            $table->string('tolerance')->nullable();
            $table->unsignedSmallInteger('calibration_interval_months')->default(12);
            $table->date('last_calibration_date')->nullable();
            $table->date('next_calibration_date')->nullable();
            $table->enum('status', ['active', 'quarantine', 'maintenance', 'retired'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'next_calibration_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
