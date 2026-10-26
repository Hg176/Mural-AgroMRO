<div>
    @unless ($compact)
        <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 class="text-2xl font-semibold text-stone-900">Novidades</h1>
                <p class="text-sm text-stone-500">Tudo o que mudou no projeto, do mais recente para o mais antigo.</p>
            </div>

            <div class="flex rounded-lg bg-white p-1 shadow-sm ring-1 ring-stone-200">
                @foreach (['tudo' => 'Tudo', 'arquivos' => 'Arquivos e pastas', 'comentarios' => 'Comentários'] as $value => $label)
                    <button wire:click="$set('filter', '{{ $value }}')"
                        @class([
                            'rounded-md px-3 py-1.5 text-sm font-medium transition',
                            'bg-emerald-700 text-white' => $filter === $value,
                            'text-stone-600 hover:bg-stone-100' => $filter !== $value,
                        ])>{{ $label }}</button>
                @endforeach
            </div>
        </div>
    @endunless

    <div @class(['rounded-xl bg-white shadow-sm ring-1 ring-stone-200', 'p-5' => ! $compact, 'px-5 py-2' => $compact])>
        @forelse ($activities->groupBy(fn ($activity) => $activity->created_at->isToday() ? 'Hoje' : ($activity->created_at->isYesterday() ? 'Ontem' : $activity->created_at->translatedFormat('d \d\e F'))) as $day => $items)
            <h3 class="mt-3 text-xs font-semibold uppercase tracking-wider text-stone-400 first:mt-1">{{ $day }}</h3>
            <ul class="divide-y divide-stone-100">
                @foreach ($items as $activity)
                    <x-activity-item :activity="$activity" :new="$this->isNew($activity)" wire:key="activity-{{ $activity->id }}" />
                @endforeach
            </ul>
        @empty
            <p class="py-10 text-center text-sm text-stone-500">Nada por aqui ainda.</p>
        @endforelse
    </div>

    @unless ($compact)
        <div class="mt-4">{{ $activities->links() }}</div>
    @endunless
</div>
