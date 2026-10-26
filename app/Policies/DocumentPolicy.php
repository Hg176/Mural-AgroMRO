<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\Folder;
use App\Models\User;

class DocumentPolicy
{
    public function view(User $user, Document $document): bool
    {
        return $user->can('view', $document->folder);
    }

    public function create(User $user, Folder $folder): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, Document $document): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, Document $document): bool
    {
        return $user->isAdmin();
    }
}
