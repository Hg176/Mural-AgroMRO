<div class="space-y-8">
    <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
        <p class="text-sm font-medium text-emerald-700">Olá, {{ Str::before(auth()->user()->name, ' ') }}</p>
        <h1 class="mt-1 text-2xl font-semibold text-stone-900">Acompanhe a evolução do AgroMRO</h1>
        <p class="mt-2 max-w-2xl text-stone-600">
            Aqui ficam os estudos, as atualizações de desenvolvimento e as conversas de cada tema.
            Tudo o que muda aparece em <a href="{{ route('feed') }}" wire:navigate class="font-medium text-emerald-800 hover:underline">Novidades</a>.
        </p>
        <dl class="mt-5 grid grid-cols-3 gap-3 sm:max-w-md">
            @foreach ($stats as $label => $value)
                <div class="rounded-lg bg-stone-50 px-4 py-3 ring-1 ring-stone-200">
                    <dt class="text-xs text-stone-500">{{ $label }}</dt>
                    <dd class="text-xl font-semibold text-stone-900">{{ $value }}</dd>
                </div>
            @endforeach
        </dl>
    </section>

    <div class="grid gap-8 lg:grid-cols-5">
        <section class="lg:col-span-3">
            <div class="mb-3 flex items-center justify-between">
                <h2 class="text-lg font-semibold text-stone-900">Últimas novidades</h2>
                <a href="{{ route('feed') }}" wire:navigate class="text-sm font-medium text-emerald-800 hover:underline">Ver tudo</a>
            </div>
            <livewire:feed compact />
        </section>

        <aside class="space-y-8 lg:col-span-2">
            <section>
                <div class="mb-3 flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-stone-900">Temas</h2>
                    <a href="{{ route('folders.index') }}" wire:navigate class="text-sm font-medium text-emerald-800 hover:underline">Abrir arquivos</a>
                </div>
                <div class="grid gap-3">
                    @forelse ($folders as $folder)
                        <x-folder-card :folder="$folder" wire:key="folder-{{ $folder->id }}" />
                    @empty
                        <p class="rounded-xl bg-white p-6 text-center text-sm text-stone-500 ring-1 ring-stone-200">Nenhuma pasta criada ainda.</p>
                    @endforelse
                </div>
            </section>

            @if ($latestDocuments->isNotEmpty())
                <section>
                    <h2 class="mb-3 text-lg font-semibold text-stone-900">Documentos recentes</h2>
                    <ul class="divide-y divide-stone-100 rounded-xl bg-white shadow-sm ring-1 ring-stone-200">
                        @foreach ($latestDocuments as $document)
                            <li class="flex items-center gap-3 px-4 py-3">
                                <span class="flex h-8 w-10 items-center justify-center rounded bg-sky-50 text-[10px] font-bold text-sky-700 ring-1 ring-sky-200">{{ $document->extension() }}</span>
                                <div class="min-w-0 flex-1">
                                    <a href="{{ route('folders.show', $document->folder_id) }}#documento-{{ $document->id }}" wire:navigate class="block truncate text-sm font-medium text-stone-800 hover:text-emerald-800">{{ $document->name }}</a>
                                    <p class="text-xs text-stone-500">{{ $document->folder->name }} · <x-time :at="$document->updated_at" /></p>
                                </div>
                            </li>
                        @endforeach
                    </ul>
                </section>
            @endif
        </aside>
    </div>
</div>
