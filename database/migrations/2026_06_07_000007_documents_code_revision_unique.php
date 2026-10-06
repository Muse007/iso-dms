<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Same code is allowed as long as the revision differs.
            $table->dropUnique('documents_code_unique');
            $table->unique(['code', 'current_revision'], 'documents_code_revision_unique');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropUnique('documents_code_revision_unique');
            $table->unique('code', 'documents_code_unique');
        });
    }
};
