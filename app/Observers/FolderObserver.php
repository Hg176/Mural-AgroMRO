<?php

namespace App\Observers;

use App\Enums\ActivityType;
use App\Models\Activity;
use App\Models\Document;
use App\Models\Folder;
use Illuminate\Support\Facades\Storage;

class FolderObserver
{
    public function created(Folder $folder): void
    {
        Activity::record(
            ActivityType::FolderCreated,
            $folder,
            folder: $folder,
            properties: ['name' => $folder->name],
            user: $folder->creator,
        );
    }

    public function deleting(Folder $folder): void
    {
        // O banco apaga subpastas e documentos em cascata, mas não sabe dos
        // arquivos no disco. Limpamos eles aqui, sem gerar um evento por arquivo.
        Document::query()
            ->whereIn('folder_id', $folder->descendantIdsAndSelf())
            ->each(fn (Document $document) => Storage::disk($document->disk)->delete($document->path));
    }

    public function deleted(Folder $folder): void
    {
        // A pasta já não existe; o evento fica pendurado na pasta-mãe (ou na raiz).
        Activity::record(
            ActivityType::FolderDeleted,
            $folder,
            folder: $folder->parent,
            properties: ['name' => $folder->name],
        );
    }
}
