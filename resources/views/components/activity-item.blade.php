@props(['activity', 'new' => false])

@php
    $url = $activity->url();
    $props = $activity->properties ?? [];
    $iconColors = [
        'folder' => 'bg-amber-100 text-amber-700',
        'file' => 'bg-sky-100 text-sky-700',
        'comment' => 'bg-violet-100 text-violet-700',
    ];
    $icon = $activity->type->icon();
@endphp

<li class="relative flex gap-3 py-3">
    <div class="relative h-fit">
        <x-avatar :user="$activity->user" />
        <span class="{{ $iconColors[$icon] }} absolute -right-2 -bottom-1.5 flex size-5 items-center justify-center rounded-full ring-2 ring-white">
            <x-icon :name="$icon" class="size-3" />
        </span>
    </div>

    <div class="min-w-0 flex-1">
        <p class="text-sm">
            <span class="font-semibold">{{ $activity->user?->name ?? 'Alguém' }}</span>
            {{ $activity->type->description() }}
            @if ($url)
                <a href="{{ $url }}" wire:navigate class="font-medium text-emerald-800 hover:underline">{{ $props['name'] ?? '' }}</a>
            @else
                <span class="font-medium text-stone-500 line-through decoration-stone-300">{{ $props['name'] ?? '' }}</span>
            @endif
            @if (($props['version'] ?? 1) > 1)
                <span class="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">v{{ $props['version'] }}</span>
            @endif
            @if (isset($props['folder']))
                <span class="text-stone-500">em {{ $props['folder'] }}</span>
            @endif
            @if ($new)
                <span class="ml-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">novo</span>
            @endif
        </p>

        @if (isset($props['excerpt']))
            <p class="mt-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">“{{ $props['excerpt'] }}”</p>
        @endif

        <x-time :at="$activity->created_at" class="mt-1 block text-xs text-stone-500" />
    </div>
</li>
