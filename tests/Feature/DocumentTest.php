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

beforeEach(function () {
    Storage::fake('local');
    $this->hugo = User::factory()->admin()->create();
    $this->folder = Folder::factory()->create(['name' => 'Desenvolvimento']);
});

function upload(User $user, Folder $folder, string $name = 'semana-44.pdf', string $mime = 'application/pdf')
{
    return Livewire::actingAs($user)
        ->test(FolderBrowser::class, ['folder' => $folder])
        ->set('uploads', [UploadedFile::fake()->create($name, 100, $mime)]);
}

it('admin envia arquivos e cada um vira uma notícia no feed', function () {
    upload($this->hugo, $this->folder)->assertHasNoErrors();

    $document = Document::sole();
    expect($document)
        ->name->toBe('semana-44.pdf')
        ->version->toBe(1)
        ->uploaded_by->toBe($this->hugo->id);
    Storage::disk('local')->assertExists($document->path);

    expect(Activity::where('type', ActivityType::DocumentUploaded)->sole()->properties)
        ->toMatchArray(['name' => 'semana-44.pdf', 'folder' => 'Desenvolvimento']);
});

it('sócio não envia arquivos', function () {
    upload(User::factory()->create(), $this->folder)->assertForbidden();

    expect(Document::count())->toBe(0);
});

it('nova versão substitui o arquivo, sobe a versão e avisa no feed', function () {
    upload($this->hugo, $this->folder);
    $document = Document::sole();
    $oldPath = $document->path;

    Livewire::actingAs($this->hugo)
        ->test(FolderBrowser::class, ['folder' => $this->folder])
        ->set("replacements.{$document->id}", UploadedFile::fake()->create('semana-44.pdf', 200, 'application/pdf'))
        ->assertHasNoErrors();

    $document->refresh();
    expect($document->version)->toBe(2)
        ->and($document->path)->not->toBe($oldPath);
    Storage::disk('local')->assertMissing($oldPath);
    Storage::disk('local')->assertExists($document->path);

    expect(Activity::latest('id')->first())
        ->type->toBe(ActivityType::DocumentReplaced)
        ->user_id->toBe($this->hugo->id);
});

it('renomear não gera notícia de nova versão', function () {
    upload($this->hugo, $this->folder);

    Document::sole()->update(['name' => 'outro-nome.pdf']);

    expect(Activity::where('type', ActivityType::DocumentReplaced)->count())->toBe(0);
});

it('apagar remove o arquivo do disco', function () {
    upload($this->hugo, $this->folder);
    $document = Document::sole();

    Livewire::actingAs($this->hugo)
        ->test(FolderBrowser::class, ['folder' => $this->folder])
        ->call('deleteDocument', $document->id);

    expect(Document::count())->toBe(0);
    Storage::disk('local')->assertMissing($document->path);
});

it('sócio baixa os arquivos', function () {
    upload($this->hugo, $this->folder);

    $this->actingAs(User::factory()->create())
        ->get(route('documents.download', Document::sole()))
        ->assertOk()
        ->assertDownload('semana-44.pdf');
});

it('quem não está logado não baixa nada', function () {
    upload($this->hugo, $this->folder);
    auth()->logout();

    $this->get(route('documents.download', Document::sole()))->assertRedirect(route('login'));
});

it('só abre no navegador o que dá para visualizar', function () {
    upload($this->hugo, $this->folder);
    upload($this->hugo, $this->folder, 'planilha.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    $sander = User::factory()->create();

    $this->actingAs($sander)->get(route('documents.preview', Document::firstWhere('name', 'semana-44.pdf')))->assertOk();
    $this->actingAs($sander)->get(route('documents.preview', Document::firstWhere('name', 'planilha.xlsx')))->assertNotFound();
});
