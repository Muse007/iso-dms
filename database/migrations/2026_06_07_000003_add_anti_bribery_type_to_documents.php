<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Add 'anti_bribery' (Kebijakan Anti Suap) to the document type enum.
        DB::statement("ALTER TABLE documents MODIFY COLUMN type ENUM('policy','manual','sop','work_instruction','form','record','other','anti_bribery') NOT NULL DEFAULT 'sop'");
    }

    public function down(): void
    {
        DB::statement("UPDATE documents SET type = 'policy' WHERE type = 'anti_bribery'");
        DB::statement("ALTER TABLE documents MODIFY COLUMN type ENUM('policy','manual','sop','work_instruction','form','record','other') NOT NULL DEFAULT 'sop'");
    }
};
