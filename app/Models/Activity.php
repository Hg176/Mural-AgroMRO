<?php

namespace App\Models;

use App\Enums\ActivityType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Auth;

/**
 * Uma linha do feed. É gravada pelos observers (app/Observers), então nenhuma
 * tela precisa lembrar de registrar o que fez.
 */
class Activity extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'type', 'folder_id', 'properties'];

    protected function casts(): array
    {
        return [
            'type' => ActivityType::class,
            'properties' => 'array',
        ];
    }

    /** @param  array<string, mixed>  $properties */
    public static function record(
        ActivityType $type,
        Model $subject,
        ?Folder $folder,
        array $properties = [],
        ?User $user = null,
    ): self {
        $activity = new self([
            'type' => $type,
            'user_id' => $user?->id ?? Auth::id(),
            'folder_id' => $folder?->id,
            'properties' => $properties,
        ]);
        $activity->subject()->associate($subject);
        $activity->save();

        return $activity;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(Folder::class);
    }

    /** Para onde o item do feed leva. Nulo quando o alvo já foi apagado. */
    public function url(): ?string
    {
        return match (true) {
            $this->subject instanceof Document => route('folders.show', $this->subject->folder_id).'#documento-'.$this->subject->id,
            $this->subject instanceof Comment && $this->folder !== null => route('folders.show', $this->folder).'#comentarios',
            $this->subject instanceof Folder => route('folders.show', $this->subject),
            default => null,
        };
    }
}
