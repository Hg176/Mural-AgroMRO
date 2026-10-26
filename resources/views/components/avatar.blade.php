@props(['user' => null, 'size' => 'size-9'])

@php
    // Cor estável por pessoa, para o Sander e o Zé se reconhecerem no feed.
    $palette = ['bg-emerald-600', 'bg-amber-600', 'bg-sky-600', 'bg-rose-600', 'bg-violet-600'];
    $color = $user ? $palette[$user->id % count($palette)] : 'bg-stone-400';
@endphp

<span {{ $attributes->merge(['class' => "$size $color inline-flex shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"]) }} title="{{ $user?->name ?? 'Usuário removido' }}">
    {{ $user?->initials() ?? '?' }}
</span>
