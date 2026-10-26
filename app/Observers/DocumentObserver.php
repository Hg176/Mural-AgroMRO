<?php

namespace App\Observers;

use App\Enums\ActivityType;
use App\Models\Activity;
use App\Models\Document;
use Illuminate\Support\Facades\Storage;

class DocumentObserver
{
    public function created(Document $document): void
    {
        $this->record(ActivityType::DocumentUploaded, $document);
    }

    public function updated(Document $document): void
    {
        // Só vira notícia quando o arquivo em si muda (nova versão);
        // renomear ou editar a descrição não polui o feed.
        if (! $document->wasChanged('path')) {
            return;
        }

        Storage::disk($document->getOriginal('disk'))->delete($document->getOriginal('path'));

        $this->record(ActivityType::DocumentReplaced, $document);
    }

    public function deleted(Document $document): void
    {
        Storage::disk($document->disk)->delete($document->path);

        $this->record(ActivityType::DocumentDeleted, $document);
    }

    private function record(ActivityType $type, Document $document): void
    {
        Activity::record(
            $type,
            $document,
            folder: $document->folder,
            properties: [
                'name' => $document->name,
                'folder' => $document->folder->name,
                'version' => $document->version,
            ],
            user: $type === ActivityType::DocumentUploaded ? $document->uploader : null,
        );
    }
}
