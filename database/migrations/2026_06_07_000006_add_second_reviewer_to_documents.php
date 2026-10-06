<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Second reviewer ("Ditinjau Oleh" #2) — optional.
            $table->foreignId('reviewed_by_2_user_id')->nullable()->after('reviewed_by_user_id')
                ->constrained('users')->nullOnDelete();
            $table->string('reviewed_by_2_name')->nullable()->after('reviewed_by_2_user_id');
            $table->date('reviewed_by_2_date')->nullable()->after('reviewed_by_2_name');
            $table->timestamp('reviewed_2_at')->nullable()->after('reviewed_at');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by_2_user_id');
            $table->dropColumn(['reviewed_by_2_name', 'reviewed_by_2_date', 'reviewed_2_at']);
        });
    }
};
