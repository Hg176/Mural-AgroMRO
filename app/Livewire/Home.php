<?php

namespace App\Livewire;

use App\Models\Comment;
use App\Models\Document;
use App\Models\Folder;
use Illuminate\View\View;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Title('Início')]
class Home extends Component
{
    public function render(): View
    {
        return view('livewire.home', [
            'folders' => Folder::query()
                ->whereNull('parent_id')
                ->withCount(['documents', 'comments', 'children'])
                ->orderBy('name')
                ->get(),
            'stats' => [
                'Pastas' => Folder::count(),
                'Arquivos' => Document::count(),
                'Comentários' => Comment::count(),
            ],
            'latestDocuments' => Document::with('folder')->latest('updated_at')->limit(5)->get(),
        ]);
    }
}
