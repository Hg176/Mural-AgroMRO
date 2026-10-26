<?php

namespace App\Models;

use App\Observers\FolderObserver;
use Database\Factories\FolderFactory;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Collection;

/**
 * Uma pasta é um "tema" (Estudos, Desenvolvimento...). Cada pasta tem uma
 * única seção de comentários, ligada a ela pelo relacionamento comments().
 */
#[ObservedBy(FolderObserver::class)]
class Folder extends Model
{
    /** @use HasFactory<FolderFactory> */
    use HasFactory;

    protected $fillable = ['parent_id', 'created_by', 'name', 'description'];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('name');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class)->latest('updated_at');
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable')->oldest();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Caminho da raiz até esta pasta, para o breadcrumb.
     *
     * @return Collection<int, Folder>
     */
    public function ancestorsAndSelf(): Collection
    {
        $path = collect([$this]);
        $current = $this;

        while ($current->parent_id !== null) {
            $current = $current->parent;
            $path->prepend($current);
        }

        return $path;
    }

    /** @return list<int> */
    public function descendantIdsAndSelf(): array
    {
        $ids = [$this->id];
        $frontier = [$this->id];

        while ($frontier !== []) {
            $frontier = self::whereIn('parent_id', $frontier)->pluck('id')->all();
            array_push($ids, ...$frontier);
        }

        return $ids;
    }
}
