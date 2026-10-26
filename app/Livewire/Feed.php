<?php

namespace App\Livewire;

use App\Enums\ActivityType;
use App\Models\Activity;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;
use Livewire\Attributes\Locked;
use Livewire\Attributes\Title;
use Livewire\Attributes\Url;
use Livewire\Component;
use Livewire\WithPagination;

/**
 * Linha do tempo do projeto. Aparece inteira em /novidades e resumida na
 * página inicial (compact). Marca o que chegou desde a última visita.
 */
#[Title('Novidades')]
class Feed extends Component
{
    use WithPagination;

    #[Url(as: 'filtro')]
    public string $filter = 'tudo';

    #[Locked]
    public bool $compact = false;

    #[Locked]
    public ?string $seenAt = null;

    public function mount(bool $compact = false): void
    {
        $this->compact = $compact;

        $user = Auth::user();
        $this->seenAt = $user->feed_seen_at?->toIso8601String();

        // Só a página completa conta como "li as novidades"; o resumo da
        // página inicial mostra os itens novos sem zerar o contador.
        if (! $compact) {
            $user->forceFill(['feed_seen_at' => now()])->save();
        }
    }

    public function updatedFilter(): void
    {
        $this->resetPage();
    }

    public function isNew(Activity $activity): bool
    {
        return $activity->user_id !== Auth::id()
            && ($this->seenAt === null || $activity->created_at->gt(Carbon::parse($this->seenAt)));
    }

    public function render(): View
    {
        $query = Activity::query()
            ->with(['user', 'subject', 'folder'])
            ->when($this->filter !== 'tudo', fn ($query) => $query->whereIn('type', ActivityType::valuesForGroup($this->filter)))
            ->latest('created_at')
            ->latest('id');

        return view('livewire.feed', [
            'activities' => $this->compact ? $query->limit(8)->get() : $query->paginate(20),
        ]);
    }
}
