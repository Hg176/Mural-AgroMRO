<?php

namespace App\Livewire;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;
use Livewire\Attributes\Locked;
use Livewire\Attributes\Validate;
use Livewire\Component;

/**
 * Seção de comentários de um tema. Recebe qualquer model com o
 * relacionamento comments(); hoje é usada só nas pastas.
 */
class Comments extends Component
{
    #[Locked]
    public Model $commentable;

    #[Validate('required|string|max:5000', as: 'comentário')]
    public string $body = '';

    public function post(): void
    {
        $this->authorize('comment', $this->commentable);
        $this->validate();

        $this->commentable->comments()->create([
            'user_id' => Auth::id(),
            'body' => trim($this->body),
        ]);

        $this->reset('body');
    }

    public function delete(int $commentId): void
    {
        $comment = $this->commentable->comments()->findOrFail($commentId);
        $this->authorize('delete', $comment);

        $comment->delete();
    }

    public function render(): View
    {
        return view('livewire.comments', [
            'comments' => $this->commentable->comments()->with('author')->get(),
        ]);
    }
}
