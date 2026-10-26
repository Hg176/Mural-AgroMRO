<section id="comentarios" class="rounded-xl bg-white shadow-sm ring-1 ring-stone-200">
    <header class="border-b border-stone-100 px-5 py-4">
        <h2 class="flex items-center gap-2 font-semibold text-stone-900">
            <x-icon name="comment" class="size-4 text-violet-600" />
            Comentários sobre {{ $commentable->name }}
        </h2>
        <p class="text-xs text-stone-500">Um espaço de conversa para este tema.</p>
    </header>

    <ul class="max-h-[32rem] space-y-4 overflow-y-auto px-5 py-4">
        @forelse ($comments as $comment)
            <li class="flex gap-3" wire:key="comment-{{ $comment->id }}">
                <x-avatar :user="$comment->author" size="size-8" />
                <div class="min-w-0 flex-1">
                    <div class="flex items-baseline gap-2">
                        <span class="text-sm font-semibold">{{ $comment->author->name }}</span>
                        <x-time :at="$comment->created_at" class="text-xs text-stone-500" />
                        @can('delete', $comment)
                            <button wire:click="delete({{ $comment->id }})" wire:confirm="Apagar este comentário?" class="ml-auto text-stone-400 hover:text-rose-600" title="Apagar">
                                <x-icon name="trash" class="size-3.5" />
                            </button>
                        @endcan
                    </div>
                    <p class="mt-1 whitespace-pre-line text-sm text-stone-700">{{ $comment->body }}</p>
                </div>
            </li>
        @empty
            <li class="py-6 text-center text-sm text-stone-500">Ninguém comentou ainda. Comece a conversa.</li>
        @endforelse
    </ul>

    @can('comment', $commentable)
        <form wire:submit="post" class="border-t border-stone-100 p-4">
            <textarea wire:model="body" rows="3" placeholder="Escreva um comentário..."
                class="w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"></textarea>
            @error('body') <p class="mt-1 text-sm text-rose-600">{{ $message }}</p> @enderror
            <div class="mt-2 flex justify-end">
                <button class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800" wire:loading.attr="disabled">Comentar</button>
            </div>
        </form>
    @endcan
</section>
