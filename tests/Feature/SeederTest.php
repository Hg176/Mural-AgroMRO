<?php

use App\Models\Activity;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

it('os dados de demonstração sobem sem erro', function () {
    Storage::fake('local');

    $this->seed();

    expect(User::count())->toBe(3)
        ->and(Activity::count())->toBeGreaterThan(10);

    $this->actingAs(User::firstWhere('email', 'sander@mural.test'))
        ->get(route('home'))
        ->assertOk()
        ->assertSee('Acompanhe a evolução do AgroMRO');
});
