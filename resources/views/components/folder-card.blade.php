@props(['folder'])

<a href="{{ route('folders.show', $folder) }}" wire:navigate
   class="group flex flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-emerald-300">
    <div class="flex items-start gap-3">
        <span class="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <x-icon name="folder" />
        </span>
        <div class="min-w-0">
            <h3 class="truncate font-semibold text-stone-900 group-hover:text-emerald-800">{{ $folder->name }}</h3>
            @if ($folder->description)
                <p class="mt-0.5 line-clamp-2 text-sm text-stone-500">{{ $folder->description }}</p>
            @endif
        </div>
    </div>
    <div class="mt-4 flex gap-4 text-xs text-stone-500">
        @if ($folder->children_count)
            <span class="flex items-center gap-1"><x-icon name="folder" class="size-3.5" /> {{ $folder->children_count }}</span>
        @endif
        <span class="flex items-center gap-1"><x-icon name="file" class="size-3.5" /> {{ $folder->documents_count }} {{ Str::plural('arquivo', $folder->documents_count) }}</span>
        <span class="flex items-center gap-1"><x-icon name="comment" class="size-3.5" /> {{ $folder->comments_count }}</span>
    </div>
</a>
