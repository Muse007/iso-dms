<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('document_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->cascadeOnDelete();
            $table->string('revision', 16);
            $table->string('file_path');
            $table->string('file_name');
            $table->unsignedBigInteger('file_size')->default(0);
            $table->string('mime_type', 96)->nullable();
            $table->string('checksum', 64)->nullable();
            $table->text('change_summary')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->boolean('is_current')->default(false);
            $table->timestamps();

            $table->unique(['document_id', 'revision']);
            $table->index(['document_id', 'is_current']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_versions');
    }
};
