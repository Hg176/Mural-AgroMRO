<?php

namespace App\Policies;

use App\Models\Folder;
use App\Models\User;

/**
 * Hoje: todo usuário logado vê tudo e comenta; só o admin organiza as pastas.
 * Se um dia houver pastas restritas, é aqui que a regra entra.
 */
class FolderPolicy
{
    public function view(User $user, Folder $folder): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, Folder $folder): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, Folder $folder): bool
    {
        return $user->isAdmin();
    }

    public function comment(User $user, Folder $folder): bool
    {
        return $this->view($user, $folder);
    }
}
