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

## Colocando no ar (Supabase)

O Supabase guarda o **banco** (Postgres) e os **arquivos** (Storage). O aplicativo
Laravel em si roda numa hospedagem PHP ligada a este repositório (recomendado:
[Laravel Cloud](https://cloud.laravel.com), que publica sozinho a cada merge na `main`).

### 1. Banco no Supabase

No **SQL Editor** do projeto, crie um schema só do mural:

```sql
create schema if not exists mural;
```

Assim as tabelas do mural não se misturam com as do seu outro projeto e não ficam
expostas pela API REST do Supabase (que só publica os schemas configurados nela).

Em **Connect > Session pooler**, copie host, porta, usuário e senha. Use o *session
pooler* e não a conexão direta: a direta é só IPv6 e muitas hospedagens não alcançam.

### 2. Arquivos no Supabase Storage

1. Em **Storage**, crie um bucket **privado** chamado `mural`.
2. Em **Storage > S3 Connection**, copie o endpoint e a região e gere um par de
   *access keys*. Guarde a secret: ela só aparece uma vez.

### 3. Variáveis de ambiente na hospedagem

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://endereco-do-mural
APP_KEY=            # gere com: php artisan key:generate --show

DB_CONNECTION=pgsql
DB_HOST=aws-0-sa-east-1.pooler.supabase.com
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres.SEU_PROJECT_REF
DB_PASSWORD=...
DB_SSLMODE=require
DB_SEARCH_PATH=mural

DOCUMENTS_DISK=supabase
SUPABASE_STORAGE_ENDPOINT=https://SEU_PROJECT_REF.storage.supabase.co/storage/v1/s3
SUPABASE_STORAGE_REGION=sa-east-1
SUPABASE_STORAGE_BUCKET=mural
SUPABASE_STORAGE_KEY=...
SUPABASE_STORAGE_SECRET=...
```

Como as sessões e o cache usam o banco (`SESSION_DRIVER=database`), não é preciso
mais nada para o login funcionar entre deploys.

### 4. Primeiro deploy

Configure o comando de deploy para rodar `php artisan migrate --force`. Depois, pelo
terminal/comandos da hospedagem, crie as contas:

```bash
php artisan mural:usuario   # uma vez para você, o Sander e o Zé
```

Mande para cada sócio o link e a senha. Eles não precisam de GitHub. Não rode o
seeder em produção: ele se recusa, porque criaria contas com a senha `password`.

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
