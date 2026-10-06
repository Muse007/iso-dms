<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Metadata terstruktur untuk event temuan.
 *
 * `note` adalah teks yang ditulis manusia (alasan revisi/penolakan) dan
 * ditampilkan sebagai kutipan. Jejak yang dihasilkan sistem — mis. berapa
 * berkas bukti yang benar-benar diterima saat submit — tidak boleh menumpang
 * di kolom itu. Tanpa jejak ini, pertanyaan "buktinya hilang atau memang tidak
 * pernah dilampirkan?" hanya bisa dijawab dengan membongkar backup database.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_finding_events', function (Blueprint $table) {
            $table->json('meta')->nullable()->after('note');
        });
    }

    public function down(): void
    {
        Schema::table('audit_finding_events', function (Blueprint $table) {
            $table->dropColumn('meta');
        });
    }
};
