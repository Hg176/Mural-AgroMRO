<?php

use App\Enums\ActivityType;
use App\Livewire\Comments;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\Folder;
use App\Models\User;
use Livewire\Livewire;

beforeEach(function () {
    $this->folder = Folder::factory()->create(['name' => 'Estudos']);
    $this->sander = User::factory()->create();
});

it('sócio comenta na seção do tema e o comentário vai para o feed', function () {
    Livewire::actingAs($this->sander)
        ->test(Comments::class, ['commentable' => $this->folder])
        ->set('body', 'Gostei do comparativo.')
        ->call('post')
        ->assertHasNoErrors()
        ->assertSet('body', '')
        ->assertSee('Gostei do comparativo.');

    expect($this->folder->comments()->sole()->user_id)->toBe($this->sander->id);
    expect(Activity::where('type', ActivityType::CommentPosted)->sole())
        ->user_id->toBe($this->sander->id)
        ->folder_id->toBe($this->folder->id)
        ->properties->toMatchArray(['name' => 'Estudos', 'excerpt' => 'Gostei do comparativo.']);
});

it('cada pasta tem a sua própria conversa', function () {
    $outra = Folder::factory()->create();
    Comment::factory()->for($outra, 'commentable')->create(['body' => 'Comentário da outra pasta']);

    Livewire::actingAs($this->sander)
        ->test(Comments::class, ['commentable' => $this->folder])
        ->assertDontSee('Comentário da outra pasta');
});

it('não aceita comentário vazio', function () {
    Livewire::actingAs($this->sander)
        ->test(Comments::class, ['commentable' => $this->folder])
        ->set('body', '')
        ->call('post')
        ->assertHasErrors('body');
});

it('autor apaga o próprio comentário, mas não o dos outros', function () {
    $meu = Comment::factory()->for($this->folder, 'commentable')->create(['user_id' => $this->sander->id]);
    $doZe = Comment::factory()->for($this->folder, 'commentable')->create();

    Livewire::actingAs($this->sander)
        ->test(Comments::class, ['commentable' => $this->folder])
        ->call('delete', $doZe->id)
        ->assertForbidden();

    Livewire::actingAs($this->sander)
        ->test(Comments::class, ['commentable' => $this->folder])
        ->call('delete', $meu->id)
        ->assertOk();

    expect(Comment::pluck('id')->all())->toBe([$doZe->id]);
});

it('admin modera qualquer comentário', function () {
    $doZe = Comment::factory()->for($this->folder, 'commentable')->create();

    Livewire::actingAs(User::factory()->admin()->create())
        ->test(Comments::class, ['commentable' => $this->folder])
        ->call('delete', $doZe->id);

    expect(Comment::count())->toBe(0);
});
