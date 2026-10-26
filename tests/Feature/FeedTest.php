<?php

use App\Livewire\Feed;
use App\Models\Comment;
use App\Models\Folder;
use App\Models\User;
use Livewire\Livewire;

it('mostra as alterações mais recentes primeiro', function () {
    $this->travelTo(now()->subDay());
    Folder::factory()->create(['name' => 'Estudos']);
    $this->travelBack();
    Folder::factory()->create(['name' => 'Desenvolvimento']);

    $this->actingAs(User::factory()->create())
        ->get(route('feed'))
        ->assertOk()
        ->assertSeeInOrder(['Hoje', 'Desenvolvimento', 'Ontem', 'Estudos']);
});

it('filtra só os comentários', function () {
    $folder = Folder::factory()->create(['name' => 'Estudos']);
    Comment::factory()->for($folder, 'commentable')->create(['body' => 'Um comentário qualquer']);

    Livewire::actingAs(User::factory()->create())
        ->test(Feed::class)
        ->set('filter', 'comentarios')
        ->assertSee('Um comentário qualquer')
        ->assertDontSee('criou a pasta');
});

it('item apagado continua no feed, só sem link', function () {
    $folder = Folder::factory()->create(['name' => 'Pasta antiga']);
    $folder->delete();

    $this->actingAs(User::factory()->admin()->create())
        ->get(route('feed'))
        ->assertSee('apagou a pasta')
        ->assertSee('Pasta antiga');
});

it('conta as novidades até o sócio abrir a página de novidades', function () {
    $sander = User::factory()->create(['feed_seen_at' => now()->subHour()]);
    Folder::factory()->count(2)->create();

    expect($sander->unreadActivitiesCount())->toBe(2);

    // A página inicial mostra os itens marcados como novos, mas não zera o contador.
    $this->actingAs($sander)->get(route('home'))->assertSee('novo');
    expect($sander->fresh()->unreadActivitiesCount())->toBe(2);

    $this->actingAs($sander)->get(route('feed'));
    expect($sander->fresh()->unreadActivitiesCount())->toBe(0);
});

it('o que eu mesmo fiz não conta como novidade', function () {
    $hugo = User::factory()->admin()->create(['feed_seen_at' => now()->subHour()]);
    Folder::factory()->create(['created_by' => $hugo->id]);

    expect($hugo->unreadActivitiesCount())->toBe(0);
});
