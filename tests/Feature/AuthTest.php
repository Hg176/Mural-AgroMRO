<?php

use App\Models\User;

it('manda quem não está logado para a tela de entrar', function (string $url) {
    $this->get($url)->assertRedirect(route('login'));
})->with(['/', '/novidades', '/arquivos']);

it('entra com e-mail e senha', function () {
    $user = User::factory()->create(['email' => 'sander@mural.test']);

    $this->post(route('login'), ['email' => 'sander@mural.test', 'password' => 'password'])
        ->assertRedirect(route('home'));

    $this->assertAuthenticatedAs($user);
});

it('recusa senha errada', function () {
    User::factory()->create(['email' => 'sander@mural.test']);

    $this->from(route('login'))
        ->post(route('login'), ['email' => 'sander@mural.test', 'password' => 'errada'])
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors('email');

    $this->assertGuest();
});

it('não tem cadastro aberto', function () {
    $this->get('/registrar')->assertNotFound();
    $this->get('/register')->assertNotFound();
});
