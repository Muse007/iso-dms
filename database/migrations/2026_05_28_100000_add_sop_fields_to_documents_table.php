<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Multi-ISO support — `standard` (single, enum) stays as legacy / primary,
            // `standards` (json) holds the full list selected by the user.
            $table->json('standards')->nullable()->after('standard');

            // SOP body sections — mirror BTI procedure layout
            $table->text('purpose')->nullable()->after('description');               // TUJUAN
            $table->text('scope')->nullable()->after('purpose');                     // RUANG LINGKUP
            $table->json('references_list')->nullable()->after('scope');             // ACUAN (array of clauses)
            $table->json('definitions')->nullable()->after('references_list');       // DEFINISI
            $table->json('responsibilities')->nullable()->after('definitions');      // PENANGGUNG JAWAB
            $table->json('procedure_steps')->nullable()->after('responsibilities');  // PROSEDUR
            $table->json('related_documents')->nullable()->after('procedure_steps'); // DOKUMEN TERKAIT

            // Approval / signature block names (free-text override of workflow names if needed)
            $table->string('prepared_by_name')->nullable()->after('related_documents');
            $table->date('prepared_by_date')->nullable()->after('prepared_by_name');
            $table->string('reviewed_by_name')->nullable()->after('prepared_by_date');
            $table->date('reviewed_by_date')->nullable()->after('reviewed_by_name');
            $table->string('approved_by_name')->nullable()->after('reviewed_by_date');
            $table->date('approved_by_date')->nullable()->after('approved_by_name');
        });

        // Backfill standards = [standard] for existing rows
        DB::table('documents')->orderBy('id')->each(function ($row) {
            DB::table('documents')->where('id', $row->id)->update([
                'standards' => json_encode([$row->standard]),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn([
                'standards',
                'purpose', 'scope', 'references_list', 'definitions',
                'responsibilities', 'procedure_steps', 'related_documents',
                'prepared_by_name', 'prepared_by_date',
                'reviewed_by_name', 'reviewed_by_date',
                'approved_by_name', 'approved_by_date',
            ]);
        });
    }
};
