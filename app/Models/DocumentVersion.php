<?php

namespace App\Models;

use App\Models\Concerns\SerializesLocalDates;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentVersion extends Model
{
    use SerializesLocalDates;

    protected $fillable = [
        'document_id', 'revision', 'file_path', 'file_name', 'file_size',
        'mime_type', 'checksum', 'change_summary', 'created_by', 'is_current',
    ];

    protected $casts = ['is_current' => 'boolean'];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
