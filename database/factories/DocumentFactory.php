<?php

namespace Database\Factories;

use App\Models\Document;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Document>
 */
class DocumentFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->slug(3).'.pdf';

        return [
            'folder_id' => Folder::factory(),
            'uploaded_by' => User::factory()->admin(),
            'name' => $name,
            'disk' => 'local',
            'path' => 'documentos/'.$name,
            'mime_type' => 'application/pdf',
            'size' => fake()->numberBetween(10_000, 5_000_000),
        ];
    }
}
