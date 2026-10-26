<?php

namespace App\Models;

use App\Observers\DocumentObserver;
use Database\Factories\DocumentFactory;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Number;
use Illuminate\Support\Str;

#[ObservedBy(DocumentObserver::class)]
class Document extends Model
{
    /** @use HasFactory<DocumentFactory> */
    use HasFactory;

    protected $attributes = [
        'version' => 1,
    ];

    protected $fillable = [
        'folder_id', 'uploaded_by', 'name', 'description',
        'disk', 'path', 'mime_type', 'size', 'version',
    ];

    public function folder(): BelongsTo
    {
        return $this->belongsTo(Folder::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function humanSize(): string
    {
        return Number::fileSize($this->size, maxPrecision: 1);
    }

    public function extension(): string
    {
        return Str::upper(pathinfo($this->name, PATHINFO_EXTENSION)) ?: 'ARQ';
    }

    /** Navegador consegue mostrar sem baixar (PDF, imagem, texto). */
    public function isPreviewable(): bool
    {
        return Str::startsWith((string) $this->mime_type, ['image/', 'text/'])
            || $this->mime_type === 'application/pdf';
    }
}
