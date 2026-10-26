<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ isset($title) ? $title.' · ' : '' }}{{ config('app.name') }}</title>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700" rel="stylesheet" />
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-stone-100 font-sans text-stone-800 antialiased">
    {{-- Barra do "site", no espírito do SharePoint: identidade + navegação por abas. --}}
    <header class="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 text-white">
        <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-5 sm:px-6">
            <a href="{{ route('home') }}" wire:navigate class="flex items-center gap-3">
                <span class="flex size-10 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
                    <x-icon name="leaf" class="size-6" />
                </span>
                <span>
                    <span class="block text-lg font-semibold leading-tight">{{ config('app.name') }}</span>
                    <span class="block text-xs text-emerald-100/80">Estudos e desenvolvimento, para os sócios</span>
                </span>
            </a>

            <div class="flex items-center gap-3">
                <div class="hidden text-right sm:block">
                    <div class="text-sm font-medium">{{ auth()->user()->name }}</div>
                    <div class="text-xs text-emerald-100/80">{{ auth()->user()->role->label() }}</div>
                </div>
                <x-avatar :user="auth()->user()" class="ring-2 ring-white/40" />
                <form method="POST" action="{{ route('logout') }}">
                    @csrf
                    <button class="rounded-md p-2 text-emerald-100 hover:bg-white/10 hover:text-white" title="Sair">
                        <x-icon name="logout" />
                    </button>
                </form>
            </div>
        </div>

        <nav class="mx-auto mt-4 flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
            @php($unread = auth()->user()->unreadActivitiesCount())
            @foreach ([
                ['home', 'Início', 'home', 'home'],
                ['feed', 'Novidades', 'activity', 'feed'],
                ['folders.index', 'Arquivos', 'folder', 'folders.*'],
            ] as [$route, $label, $icon, $pattern])
                <a href="{{ route($route) }}" wire:navigate
                   @class([
                       'flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition',
                       'bg-stone-100 text-emerald-900' => request()->routeIs($pattern),
                       'text-emerald-50 hover:bg-white/10' => ! request()->routeIs($pattern),
                   ])>
                    <x-icon :name="$icon" class="size-4" />
                    {{ $label }}
                    @if ($route === 'feed' && $unread > 0)
                        <span class="rounded-full bg-amber-400 px-1.5 text-xs font-semibold text-amber-950">{{ $unread }}</span>
                    @endif
                </a>
            @endforeach
        </nav>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {{ $slot }}
    </main>
</body>
</html>
