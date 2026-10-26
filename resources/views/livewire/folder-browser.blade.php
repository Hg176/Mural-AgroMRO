<div>
    {{-- Breadcrumb --}}
    <nav class="mb-4 flex flex-wrap items-center gap-1 text-sm text-stone-500">
        <a href="{{ route('folders.index') }}" wire:navigate class="hover:text-emerald-800">Arquivos</a>
        @foreach ($breadcrumb as $crumb)
            <x-icon name="chevron-right" class="size-4" />
            @if ($loop->last)
                <span class="font-medium text-stone-800">{{ $crumb->name }}</span>
            @else
                <a href="{{ route('folders.show', $crumb) }}" wire:navigate class="hover:text-emerald-800">{{ $crumb->name }}</a>
            @endif
        @endforeach
    </nav>

    {{-- Cabeçalho da pasta --}}
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
            @if ($editing)
                <form wire:submit="saveFolder" class="space-y-2">
                    <input wire:model="name" class="w-full rounded-lg border border-stone-300 px-3 py-2 text-lg font-semibold focus:border-emerald-600 focus:outline-none">
                    <textarea wire:model="description" rows="2" placeholder="Descrição (opcional)" class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"></textarea>
                    @error('name') <p class="text-sm text-rose-600">{{ $message }}</p> @enderror
                    <div class="flex gap-2">
                        <button class="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white">Salvar</button>
                        <button type="button" wire:click="$set('editing', false)" class="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200">Cancelar</button>
                    </div>
                </form>
            @else
                <h1 class="text-2xl font-semibold text-stone-900">{{ $folder?->name ?? 'Arquivos' }}</h1>
                <p class="mt-1 max-w-2xl text-stone-600">{{ $folder?->description ?? 'Cada pasta é um tema, com seus arquivos e sua própria conversa.' }}</p>
            @endif
        </div>

        <div class="flex flex-wrap gap-2">
            @can('create', App\Models\Folder::class)
                <button x-data @click="document.getElementById('nova-pasta').showModal()" class="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm ring-1 ring-stone-300 hover:bg-stone-50">
                    <x-icon name="folder-plus" class="size-4" /> Nova pasta
                </button>
            @endcan

            @if ($folder)
                @can('create', [App\Models\Document::class, $folder])
                    <label class="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800">
                        <x-icon name="upload" class="size-4" />
                        <span wire:loading.remove wire:target="uploads">Enviar arquivos</span>
                        <span wire:loading wire:target="uploads">Enviando...</span>
                        <input type="file" wire:model="uploads" multiple class="hidden">
                    </label>
                @endcan
                @can('update', $folder)
                    <button wire:click="editFolder" class="rounded-lg p-2 text-stone-500 hover:bg-stone-200 hover:text-stone-800" title="Editar pasta">
                        <x-icon name="pencil" class="size-4" />
                    </button>
                @endcan
                @can('delete', $folder)
                    <button wire:click="deleteFolder" wire:confirm="Apagar a pasta {{ $folder->name }} com todas as subpastas, arquivos e comentários?" class="rounded-lg p-2 text-stone-500 hover:bg-rose-50 hover:text-rose-600" title="Apagar pasta">
                        <x-icon name="trash" class="size-4" />
                    </button>
                @endcan
            @endif
        </div>
    </div>

    @error('uploads.*') <p class="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{{ $message }}</p> @enderror
    @error('replacements.*') <p class="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{{ $message }}</p> @enderror

    <div @class(['grid gap-8', 'lg:grid-cols-5' => $folder])>
        <div @class(['space-y-6', 'lg:col-span-3' => $folder])>
            {{-- Subpastas --}}
            @if ($children->isNotEmpty())
                <div @class(['grid gap-3', 'sm:grid-cols-2 lg:grid-cols-3' => ! $folder, 'sm:grid-cols-2' => $folder])>
                    @foreach ($children as $child)
                        <x-folder-card :folder="$child" wire:key="folder-{{ $child->id }}" />
                    @endforeach
                </div>
            @elseif (! $folder)
                <p class="rounded-xl bg-white p-10 text-center text-sm text-stone-500 ring-1 ring-stone-200">Nenhuma pasta criada ainda.</p>
            @endif

            {{-- Arquivos --}}
            @if ($folder)
                <div class="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200">
                    <div class="border-b border-stone-100 px-5 py-3 text-sm font-semibold text-stone-700">
                        {{ $documents->count() }} {{ Str::plural('arquivo', $documents->count()) }}
                    </div>
                    <ul class="divide-y divide-stone-100">
                        @forelse ($documents as $document)
                            <li id="documento-{{ $document->id }}" wire:key="document-{{ $document->id }}" class="flex items-center gap-4 px-5 py-3 target:bg-amber-50">
                                <span class="flex h-10 w-12 shrink-0 items-center justify-center rounded-md bg-sky-50 text-[11px] font-bold text-sky-700 ring-1 ring-sky-200">{{ $document->extension() }}</span>
                                <div class="min-w-0 flex-1">
                                    <p class="truncate font-medium text-stone-800">
                                        {{ $document->name }}
                                        @if ($document->version > 1)
                                            <span class="ml-1 rounded bg-stone-100 px-1.5 py-0.5 text-xs font-normal text-stone-600">v{{ $document->version }}</span>
                                        @endif
                                    </p>
                                    <p class="text-xs text-stone-500">
                                        {{ $document->humanSize() }} · {{ $document->uploader->name }} · <x-time :at="$document->updated_at" />
                                    </p>
                                </div>
                                <div class="flex items-center gap-1">
                                    @if ($document->isPreviewable())
                                        <a href="{{ route('documents.preview', $document) }}" target="_blank" class="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-emerald-800" title="Abrir">
                                            <x-icon name="eye" class="size-4" />
                                        </a>
                                    @endif
                                    <a href="{{ route('documents.download', $document) }}" class="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-emerald-800" title="Baixar">
                                        <x-icon name="download" class="size-4" />
                                    </a>
                                    @can('update', $document)
                                        <label class="cursor-pointer rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-emerald-800" title="Enviar nova versão">
                                            <x-icon name="refresh" class="size-4" />
                                            <input type="file" class="hidden" wire:model="replacements.{{ $document->id }}">
                                        </label>
                                    @endcan
                                    @can('delete', $document)
                                        <button wire:click="deleteDocument({{ $document->id }})" wire:confirm="Apagar {{ $document->name }}?" class="rounded-md p-2 text-stone-500 hover:bg-rose-50 hover:text-rose-600" title="Apagar">
                                            <x-icon name="trash" class="size-4" />
                                        </button>
                                    @endcan
                                </div>
                            </li>
                        @empty
                            <li class="px-5 py-10 text-center text-sm text-stone-500">Nenhum arquivo nesta pasta ainda.</li>
                        @endforelse
                    </ul>
                </div>
            @endif
        </div>

        {{-- Uma seção de comentários por tema --}}
        @if ($folder)
            <div class="lg:col-span-2">
                <livewire:comments :commentable="$folder" :key="'comments-'.$folder->id" />
            </div>
        @endif
    </div>

    @can('create', App\Models\Folder::class)
        <dialog id="nova-pasta" x-data x-on:close-dialog.window="$el.close()" class="m-auto w-full max-w-md rounded-2xl p-0 shadow-2xl backdrop:bg-stone-900/40">
            <form wire:submit="createFolder" class="space-y-4 p-6">
                <h2 class="text-lg font-semibold text-stone-900">Nova pasta{{ $folder ? ' em '.$folder->name : '' }}</h2>
                <div>
                    <label class="mb-1 block text-sm font-medium text-stone-700">Nome</label>
                    <input wire:model="newFolderName" placeholder="Ex.: Estudos" class="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-emerald-600 focus:outline-none">
                    @error('newFolderName') <p class="mt-1 text-sm text-rose-600">{{ $message }}</p> @enderror
                </div>
                <div>
                    <label class="mb-1 block text-sm font-medium text-stone-700">Descrição <span class="font-normal text-stone-400">(opcional)</span></label>
                    <textarea wire:model="newFolderDescription" rows="3" class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"></textarea>
                </div>
                <div class="flex justify-end gap-2">
                    <button type="button" @click="$el.closest('dialog').close()" class="rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-100">Cancelar</button>
                    <button class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">Criar pasta</button>
                </div>
            </form>
        </dialog>
    @endcan
</div>
