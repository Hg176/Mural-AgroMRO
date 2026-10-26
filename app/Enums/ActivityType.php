<?php

namespace App\Enums;

/**
 * Tudo o que aparece no feed. Para um novo tipo de evento basta um novo case
 * aqui, a frase em description() e o ícone em icon().
 */
enum ActivityType: string
{
    case FolderCreated = 'folder.created';
    case FolderDeleted = 'folder.deleted';
    case DocumentUploaded = 'document.uploaded';
    case DocumentReplaced = 'document.replaced';
    case DocumentDeleted = 'document.deleted';
    case CommentPosted = 'comment.posted';

    public function description(): string
    {
        return match ($this) {
            self::FolderCreated => 'criou a pasta',
            self::FolderDeleted => 'apagou a pasta',
            self::DocumentUploaded => 'enviou o arquivo',
            self::DocumentReplaced => 'enviou uma nova versão de',
            self::DocumentDeleted => 'apagou o arquivo',
            self::CommentPosted => 'comentou em',
        };
    }

    public function icon(): string
    {
        return match ($this) {
            self::FolderCreated, self::FolderDeleted => 'folder',
            self::DocumentUploaded, self::DocumentReplaced, self::DocumentDeleted => 'file',
            self::CommentPosted => 'comment',
        };
    }

    /** Agrupamento usado pelos filtros do feed. */
    public function group(): string
    {
        return match ($this) {
            self::CommentPosted => 'comentarios',
            default => 'arquivos',
        };
    }

    /** @return list<string> */
    public static function valuesForGroup(string $group): array
    {
        return array_values(array_map(
            fn (self $type) => $type->value,
            array_filter(self::cases(), fn (self $type) => $type->group() === $group),
        ));
    }
}
