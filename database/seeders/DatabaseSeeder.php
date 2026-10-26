<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Document;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

/**
 * Dados de demonstração: os três sócios, alguns temas, arquivos e conversas
 * espalhados pelos últimos dias, para o feed já nascer com cara de uso real.
 * As senhas são só para rodar localmente; em produção use "mural:usuario".
 */
class DatabaseSeeder extends Seeder
{
    private User $hugo;

    private Carbon $today;

    public function run(): void
    {
        $this->today = Carbon::today();

        $this->hugo = User::create(['name' => 'Hugo Ferreira', 'email' => 'hugo@mural.test', 'password' => 'password', 'role' => Role::Admin]);
        $sander = User::create(['name' => 'Sander Gandolfi', 'email' => 'sander@mural.test', 'password' => 'password', 'role' => Role::Socio]);
        $ze = User::create(['name' => 'José Oliveira', 'email' => 'ze@mural.test', 'password' => 'password', 'role' => Role::Socio]);

        // Ações "de sistema" (nova versão, por exemplo) pegam o usuário logado.
        Auth::setUser($this->hugo);

        $this->at(6, '09:12');
        $estudos = $this->folder('Estudos', 'Pesquisas, comparativos e materiais que embasam as decisões técnicas.');
        $desenvolvimento = $this->folder('Desenvolvimento', 'Atualizações semanais do que foi construído na plataforma.');
        $decisoes = $this->folder('Reuniões e decisões', 'Atas, combinados e próximos passos entre os sócios.');

        $this->at(6, '09:40');
        $this->document($estudos, 'Comparativo-multi-tenancy.md', "# Multi-tenancy no Laravel\n\n## Opções avaliadas\n- Banco único com tenant_id\n- Banco por cliente (stancl/tenancy)\n\n## Recomendação\nComeçar com banco único e testes de isolamento.\n");

        $this->at(5, '14:05');
        $multitenant = $this->folder('Arquitetura multi-tenant', 'Estudo prático de isolamento de dados entre clientes.', $estudos);
        $this->document($multitenant, 'Testes-de-isolamento.pdf', $this->pdf('Testes de isolamento entre clientes'));

        $this->at(5, '18:30');
        $estudos->comments()->create(['user_id' => $sander->id, 'body' => 'Li o comparativo. Faz sentido começar com banco único, mas quero entender o custo de migrar depois.']);
        $this->at(5, '19:02');
        $estudos->comments()->create(['user_id' => $this->hugo->id, 'body' => 'Boa pergunta. A migração é planejada na etapa 3 do estudo; deixo um resumo aqui quando terminar.']);

        $this->at(3, '10:20');
        $this->document($desenvolvimento, 'Atualizacao-semana-43.md', "# Semana 43\n\n- Cadastro de materiais MRO\n- Importação de planilhas\n- Primeiros testes automatizados\n");
        $this->document($desenvolvimento, 'Cronograma-MVP.csv', "etapa,inicio,fim\nCadastro,2026-10-01,2026-10-31\nAnálises,2026-11-01,2026-12-15\nLançamento,2027-01-04,2027-01-29\n");

        $this->at(2, '08:45');
        $this->document($decisoes, 'Ata-reuniao-25-10.pdf', $this->pdf('Ata da reuniao de 25/10'));
        $this->at(2, '11:10');
        $decisoes->comments()->create(['user_id' => $ze->id, 'body' => 'Ata confere com o que combinamos. Vou levar o ponto do investimento para a próxima conversa.']);

        $this->at(1, '16:00');
        $semana44 = $this->document($desenvolvimento, 'Atualizacao-semana-44.md', "# Semana 44\n\n- Painel de indicadores (rascunho)\n");
        $this->at(0, '09:30');
        $this->replace($semana44, "# Semana 44\n\n- Painel de indicadores (rascunho)\n- Filtros por categoria de material\n- Exportação para Excel\n");
        $this->at(0, '10:15');
        $desenvolvimento->comments()->create(['user_id' => $sander->id, 'body' => 'A exportação para Excel vai ajudar muito na conversa com os clientes. Dá para incluir o código do fornecedor?']);

        Carbon::setTestNow();

        // Hugo já viu tudo; Sander e Zé chegam com novidades para ler.
        $this->hugo->forceFill(['feed_seen_at' => now()])->save();
        $sander->forceFill(['feed_seen_at' => now()->subDays(3)])->save();
    }

    private function at(int $daysAgo, string $time): void
    {
        Carbon::setTestNow($this->today->copy()->subDays($daysAgo)->setTimeFromTimeString($time));
    }

    private function folder(string $name, string $description, ?Folder $parent = null): Folder
    {
        return Folder::create([
            'parent_id' => $parent?->id,
            'created_by' => $this->hugo->id,
            'name' => $name,
            'description' => $description,
        ]);
    }

    private function document(Folder $folder, string $name, string $contents): Document
    {
        return Document::create([
            'folder_id' => $folder->id,
            'uploaded_by' => $this->hugo->id,
            ...$this->store($folder, $name, $contents),
        ]);
    }

    private function replace(Document $document, string $contents): void
    {
        $document->update([
            ...$this->store($document->folder, $document->name, $contents),
            'version' => $document->version + 1,
        ]);
    }

    /** @return array{name: string, disk: string, path: string, mime_type: string, size: int} */
    private function store(Folder $folder, string $name, string $contents): array
    {
        $path = 'documentos/'.$folder->id.'/'.uniqid().'-'.$name;
        Storage::disk('local')->put($path, $contents);

        return [
            'name' => $name,
            'disk' => 'local',
            'path' => $path,
            'mime_type' => match (pathinfo($name, PATHINFO_EXTENSION)) {
                'pdf' => 'application/pdf',
                'csv' => 'text/csv',
                default => 'text/markdown',
            },
            'size' => strlen($contents),
        ];
    }

    /** PDF mínimo de uma página, só para a demonstração ter algo para abrir. */
    private function pdf(string $title): string
    {
        $stream = "BT /F1 22 Tf 72 720 Td ({$title}) Tj ET BT /F1 12 Tf 72 690 Td (Documento de exemplo do Mural AgroMRO.) Tj ET";
        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
            '<< /Length '.strlen($stream)." >>\nstream\n{$stream}\nendstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $i => $object) {
            $offsets[] = strlen($pdf);
            $pdf .= ($i + 1)." 0 obj\n{$object}\nendobj\n";
        }

        $xref = strlen($pdf);
        $pdf .= 'xref
0 '.(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }

        return $pdf.'trailer << /Size '.(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF";
    }
}
