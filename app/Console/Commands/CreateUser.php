<?php

namespace App\Console\Commands;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

use function Laravel\Prompts\password;
use function Laravel\Prompts\select;
use function Laravel\Prompts\text;

/**
 * Não existe tela de cadastro: quem entra no mural é convidado por aqui.
 */
class CreateUser extends Command
{
    protected $signature = 'mural:usuario';

    protected $description = 'Cria ou atualiza o acesso de uma pessoa ao mural';

    public function handle(): int
    {
        $name = text('Nome', required: true);
        $email = text('E-mail', required: true, validate: fn (string $value) => Validator::make(
            ['email' => $value], ['email' => 'email'],
        )->fails() ? 'E-mail inválido.' : null);
        $role = select('Papel', collect(Role::cases())->mapWithKeys(fn (Role $role) => [$role->value => $role->label()])->all(), default: Role::Socio->value);
        $password = password('Senha (mínimo 8 caracteres)', required: true, validate: fn (string $value) => strlen($value) < 8 ? 'Use pelo menos 8 caracteres.' : null);

        $user = User::updateOrCreate(['email' => $email], [
            'name' => $name,
            'role' => $role,
            'password' => $password,
        ]);

        $this->components->info(($user->wasRecentlyCreated ? 'Acesso criado' : 'Acesso atualizado').": {$user->name} ({$user->role->label()}).");

        return self::SUCCESS;
    }
}
