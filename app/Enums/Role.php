<?php

namespace App\Enums;

enum Role: string
{
    /** Publica pastas e arquivos (Hugo). */
    case Admin = 'admin';

    /** Acompanha, baixa arquivos e comenta (Sander, Zé). */
    case Socio = 'socio';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Administrador',
            self::Socio => 'Sócio',
        };
    }
}
