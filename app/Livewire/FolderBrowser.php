<?php

namespace App\Livewire;

use App\Models\Document;
use App\Models\Folder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;
use Livewire\Component;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Livewire\WithFileUploads;

/**
 * Gerenciador de arquivos. Sem pasta = raiz (só lista os temas);
 * com pasta = subpastas, arquivos e a seção de comentários do tema.
 */
class FolderBrowser extends Component
{
    use WithFileUploads;

    public const DISK = 'local';

    public ?Folder $folder = null;

    public string $newFolderName = '';

    public string $newFolderDescription = '';

    /** @var array<int, TemporaryUploadedFile> */
    public array $uploads = [];

    /** @var array<int, TemporaryUploadedFile> nova versão, indexada pelo id do documento */
    public array $replacements = [];

    public bool $editing = false;

    public string $name = '';

    public string $description = '';

    public function mount(?Folder $folder = null): void
    {
        $this->folder = $folder?->exists ? $folder : null;
    }

    public function createFolder(): void
    {
        $this->authorize('create', Folder::class);

        $this->validate([
            'newFolderName' => 'required|string|max:120',
            'newFolderDescription' => 'nullable|string|max:500',
        ], attributes: ['newFolderName' => 'nome', 'newFolderDescription' => 'descrição']);

        Folder::create([
            'parent_id' => $this->folder?->id,
            'created_by' => Auth::id(),
            'name' => trim($this->newFolderName),
            'description' => $this->newFolderDescription ?: null,
        ]);

        $this->reset('newFolderName', 'newFolderDescription');
        $this->dispatch('close-dialog');
    }

    /** Dispara assim que o Livewire termina de subir os arquivos escolhidos. */
    public function updatedUploads(): void
    {
        abort_if($this->folder === null, 404);
        $this->authorize('create', [Document::class, $this->folder]);

        $this->validate(['uploads.*' => 'file|max:51200'], attributes: ['uploads.*' => 'arquivo']);

        foreach ($this->uploads as $file) {
            Document::create([
                'folder_id' => $this->folder->id,
                'uploaded_by' => Auth::id(),
                ...$this->storeFile($file),
            ]);
        }

        $this->reset('uploads');
    }

    public function updatedReplacements(mixed $file, string $documentId): void
    {
        $document = $this->folder->documents()->findOrFail($documentId);
        $this->authorize('update', $document);

        $this->validate(['replacements.*' => 'file|max:51200'], attributes: ['replacements.*' => 'arquivo']);

        $document->update([
            ...$this->storeFile($file),
            'version' => $document->version + 1,
        ]);

        $this->reset('replacements');
    }

    public function deleteDocument(int $documentId): void
    {
        $document = $this->folder->documents()->findOrFail($documentId);
        $this->authorize('delete', $document);

        $document->delete();
    }

    public function editFolder(): void
    {
        $this->authorize('update', $this->folder);

        $this->name = $this->folder->name;
        $this->description = (string) $this->folder->description;
        $this->editing = true;
    }

    public function saveFolder(): void
    {
        $this->authorize('update', $this->folder);

        $this->validate([
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:500',
        ], attributes: ['name' => 'nome', 'description' => 'descrição']);

        $this->folder->update([
            'name' => trim($this->name),
            'description' => $this->description ?: null,
        ]);

        $this->editing = false;
    }

    public function deleteFolder(): void
    {
        $this->authorize('delete', $this->folder);

        $parent = $this->folder->parent;
        $this->folder->delete();

        $this->redirectRoute($parent ? 'folders.show' : 'folders.index', $parent?->id, navigate: true);
    }

    /** @return array{name: string, disk: string, path: string, mime_type: ?string, size: int} */
    private function storeFile(UploadedFile $file): array
    {
        return [
            'name' => $file->getClientOriginalName(),
            'disk' => self::DISK,
            'path' => $file->store('documentos/'.$this->folder->id, self::DISK),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ];
    }

    public function render(): View
    {
        $children = Folder::query()
            ->where('parent_id', $this->folder?->id)
            ->withCount(['documents', 'comments', 'children'])
            ->orderBy('name')
            ->get();

        return view('livewire.folder-browser', [
            'children' => $children,
            'documents' => $this->folder?->documents()->with('uploader')->get() ?? collect(),
            'breadcrumb' => $this->folder?->ancestorsAndSelf() ?? collect(),
        ])->title($this->folder->name ?? 'Arquivos');
    }
}
