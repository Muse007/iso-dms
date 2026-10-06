<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('signature_path')->nullable()->after('avatar_path');
        });

        Schema::table('documents', function (Blueprint $table) {
            // User refs for the digital signature block — name columns kept as fallback / override.
            $table->foreignId('prepared_by_user_id')->nullable()->after('related_documents')->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by_user_id')->nullable()->after('prepared_by_user_id')->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by_user_id')->nullable()->after('reviewed_by_user_id')->constrained('users')->nullOnDelete();

            // Flowchart image (PNG/JPG)
            $table->string('flowchart_path')->nullable()->after('approved_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign(['prepared_by_user_id']);
            $table->dropForeign(['reviewed_by_user_id']);
            $table->dropForeign(['approved_by_user_id']);
            $table->dropColumn(['prepared_by_user_id', 'reviewed_by_user_id', 'approved_by_user_id', 'flowchart_path']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('signature_path');
        });
    }
};
