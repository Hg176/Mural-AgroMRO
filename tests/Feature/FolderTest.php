<?php

use App\Enums\ActivityType;
use App\Livewire\FolderBrowser;
use App\Models\Activity;
use App\Models\Document;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;

it('admin cria uma pasta e ela entra no feed', function () {
    $hugo = User::factory()->admin()->create();

    Livewire::actingAs($hugo)
        ->test(FolderBrowser::class)
        ->set('newFolderName', 'Estudos')
        ->call('createFolder')
        ->assertHasNoErrors();

    $folder = Folder::sole();
    expect($folder->name)->toBe('Estudos')
        ->and(Activity::sole())
        ->type->toBe(ActivityType::FolderCreated)
        ->user_id->toBe($hugo->id)
        ->folder_id->toBe($folder->id);
});

it('cria subpasta dentro da pasta aberta', function () {
    $estudos = Folder::factory()->create();

    Livewire::actingAs(User::factory()->admin()->create())
        ->test(FolderBrowser::class, ['folder' => $estudos])
        ->set('newFolderName', 'Multi-tenancy')
        ->call('createFolder');

    expect($estudos->children()->sole()->name)->toBe('Multi-tenancy');
});

it('sócio não cria nem apaga pastas', function () {
    $folder = Folder::factory()->create();
    $sander = User::factory()->create();

    Livewire::actingAs($sander)
        ->test(FolderBrowser::class)
        ->set('newFolderName', 'Minha pasta')
        ->call('createFolder')
        ->assertForbidden();

    Livewire::actingAs($sander)
        ->test(FolderBrowser::class, ['folder' => $folder])
        ->call('deleteFolder')
        ->assertForbidden();

    expect(Folder::count())->toBe(1);
});

it('sócio vê a pasta sem os botões de administração', function () {
    $folder = Folder::factory()->create(['name' => 'Estudos']);

    $this->actingAs(User::factory()->create())
        ->get(route('folders.show', $folder))
        ->assertOk()
        ->assertSee('Comentários sobre Estudos')
        ->assertDontSee('Enviar arquivos')
        ->assertDontSee('Nova pasta');
});

it('apagar uma pasta leva junto subpastas e arquivos do disco', function () {
    Storage::fake('local');
    $hugo = User::factory()->admin()->create();
    $estudos = Folder::factory()->create();
    $sub = Folder::factory()->create(['parent_id' => $estudos->id]);

    Livewire::actingAs($hugo)
        ->test(FolderBrowser::class, ['folder' => $sub])
        ->set('uploads', [UploadedFile::fake()->create('estudo.pdf', 10)]);
    $path = Document::sole()->path;
    Storage::disk('local')->assertExists($path);

    Livewire::actingAs($hugo)
        ->test(FolderBrowser::class, ['folder' => $estudos])
        ->call('deleteFolder')
        ->assertRedirect(route('folders.index'));

    expect(Folder::count())->toBe(0)
        ->and(Document::count())->toBe(0)
        ->and(Activity::latest('id')->first()->type)->toBe(ActivityType::FolderDeleted);
    Storage::disk('local')->assertMissing($path);
});
