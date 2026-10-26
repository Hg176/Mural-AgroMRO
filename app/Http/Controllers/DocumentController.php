<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Os arquivos ficam no disco privado; só saem por aqui, depois da policy.
 */
class DocumentController extends Controller
{
    public function download(Document $document): StreamedResponse
    {
        Gate::authorize('view', $document);

        return Storage::disk($document->disk)->download($document->path, $document->name);
    }

    public function preview(Document $document): StreamedResponse
    {
        Gate::authorize('view', $document);
        abort_unless($document->isPreviewable(), 404);

        return Storage::disk($document->disk)->response($document->path, $document->name);
    }
}
