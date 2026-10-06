<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Per-section image attachments for sections D–G:
            //   { "D": ["documents/section-images/x.png"], "F": ["...", "..."], ... }
            // Section F can hold multiple flowcharts via this same column.
            $table->json('section_images')->nullable()->after('related_documents');

            // Manually-entered revision history shown on page 1 of the procedure PDF
            // (mirrors the BTI PR-IT layout). Each row:
            //   { "revision": "0", "date": "28 Agustus 2023", "summary": "...", "page": "1", "mr": "Nama MR" }
            $table->json('revision_history')->nullable()->after('section_images');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['section_images', 'revision_history']);
        });
    }
};
