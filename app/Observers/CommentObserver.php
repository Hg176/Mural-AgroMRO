<?php

namespace App\Observers;

use App\Enums\ActivityType;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\Folder;
use Illuminate\Support\Str;

class CommentObserver
{
    public function created(Comment $comment): void
    {
        $commentable = $comment->commentable;

        Activity::record(
            ActivityType::CommentPosted,
            $comment,
            folder: $commentable instanceof Folder ? $commentable : null,
            properties: [
                'name' => $commentable->name,
                'excerpt' => Str::limit($comment->body, 140),
            ],
            user: $comment->author,
        );
    }
}
