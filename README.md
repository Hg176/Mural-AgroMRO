# Mural AgroMRO

Portal de acompanhamento para os sócios do AgroMRO, no espírito do SharePoint Sites:
o Hugo publica estudos e atualizações de desenvolvimento, e o Sander e o Zé acompanham,
baixam os arquivos e conversam sobre cada tema.

## O que tem hoje

- **Gerenciador de arquivos**: pastas e subpastas, envio de vários arquivos de uma vez,
  nova versão de um arquivo (v2, v3...), visualizar no navegador (PDF, imagem, texto) e baixar.
- **Uma conversa por tema**: cada pasta tem a sua própria seção de comentários.
- **Novidades (feed)**: linha do tempo com tudo o que muda (pasta criada, arquivo enviado,
  nova versão, comentário). Itens que a pessoa ainda não viu aparecem como **novo**,
  com um contador na aba Novidades.
- **Acesso por login**, sem cadastro aberto.

| Papel | Quem | Pode |
| --- | --- | --- |
| Administrador | Hugo | tudo: criar, editar e apagar pastas e arquivos, moderar comentários |
| Sócio | Sander, Zé | ver tudo, baixar, comentar e apagar os próprios comentários |

## Rodando localmente

Precisa de PHP 8.2+ (recomendado: [Laravel Herd](https://herd.laravel.com)), Composer e Node.

```bash
composer install
npm install && npm run build
cp .env.example .env
php artisan key:generate
php artisan migrate --seed   # cria os 3 sócios e dados de exemplo
php artisan serve
```

Acesse http://localhost:8000 e entre com `hugo@mural.test`, `sander@mural.test` ou
`ze@mural.test`, todos com a senha `password` (só para testes locais).

Para criar acessos de verdade: `php artisan mural:usuario`.

Testes: `vendor/bin/pest`.

> Uploads: o limite do mural é 50 MB por arquivo. O PHP também precisa permitir isso
> (`upload_max_filesize` e `post_max_size` no php.ini).

## Como o código está organizado

```
app/
  Enums/Role.php             papéis (admin, sócio)
  Enums/ActivityType.php     tipos de evento do feed, com a frase e o ícone de cada um
  Models/                    Folder, Document, Comment, Activity, User
  Observers/                 gravam o feed sozinhos quando algo é criado/alterado/apagado
  Policies/                  quem pode fazer o quê (um lugar só para as regras)
  Livewire/                  as telas: Home, Feed, FolderBrowser, Comments
  Http/Controllers/          login e download/visualização de arquivos
resources/views/             Blade + Tailwind
tests/Feature/               testes em Pest
```

Decisões que facilitam a evolução:

- **Feed via observers.** Nenhuma tela precisa "lembrar" de registrar o que fez: criou,
  trocou ou apagou um model observado, o evento aparece. Novo tipo de evento = um `case`
  em `ActivityType` + uma linha no observer.
- **O feed guarda um retrato do item** (`properties`), então o histórico continua legível
  mesmo depois que um arquivo ou pasta é apagado.
- **Comentários polimórficos** (`commentable`). Hoje só pastas têm conversa, mas dá para
  comentar em um documento ou em um marco do projeto sem mexer na tabela.
- **Arquivos em disco privado**, servidos só por rota autenticada e checada pela policy.
  Trocar para S3/R2 depois é mudar o disco.
- **Permissões nas policies.** Se um dia existir pasta restrita (ex.: só Hugo e Zé),
  a regra entra em `FolderPolicy::view`.

## Ideias para as próximas versões

- Resumo semanal por e-mail com as novidades.
- Histórico de versões de cada arquivo (hoje a versão anterior é substituída).
- Página "Roadmap / marcos" com status do desenvolvimento do AgroMRO.
- Busca por nome de arquivo e por comentários.
- Menções (@Sander) nos comentários.
