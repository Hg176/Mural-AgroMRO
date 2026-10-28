# Mural AgroMRO

Portal de acompanhamento para os sócios do AgroMRO, no espírito do SharePoint Sites:
o Hugo publica estudos e atualizações de desenvolvimento, e o Sander e o Zé acompanham,
baixam os arquivos e conversam sobre cada tema.

Roda **sem servidor próprio**: o site é estático (GitHub Pages) e fala direto com o
**Supabase**, que guarda o banco, o login e os arquivos.

## O que tem

- **Gerenciador de arquivos**: pastas e subpastas, envio de vários arquivos, nova versão
  (v2, v3...), abrir no navegador (PDF, imagem, texto, página HTML) e baixar.
- **Uma conversa por tema**: cada pasta tem a sua seção de comentários.
- **Novidades**: linha do tempo de tudo o que muda. O que a pessoa ainda não viu aparece
  como **novo**, com contador na aba.
- **Acesso por convite**: só entra quem o Hugo liberar.

| Papel | Quem | Pode |
| --- | --- | --- |
| admin | Hugo | criar, editar e apagar pastas e arquivos; moderar comentários |
| socio | Sander, Zé | ver tudo, baixar, comentar e apagar os próprios comentários |

## Como funciona (e onde está a segurança)

```
navegador (React, GitHub Pages)  ──supabase-js──▶  Supabase
                                                    ├─ Auth: login por link no e-mail
                                                    ├─ Postgres, schema "mural": tabelas + RLS + triggers do feed
                                                    └─ Storage, bucket privado "mural": os arquivos
```

Como o navegador fala direto com o banco, **as regras ficam no próprio banco**
(`supabase/migrations/`), não no site:

- **Login por código no e-mail**: sem senha. A pessoa digita o e-mail, recebe um código e
  digita no aparelho onde pediu (ou clica no link, se abriu o e-mail no mesmo aparelho);
  só contas criadas à mão recebem (o site não cria contas). A mensagem é a
  mesma para e-mail com ou sem acesso, para não revelar quem está no mural.
- **RLS** (Row Level Security): só quem tem linha em `mural.profiles` vê alguma coisa;
  só `admin` cria/edita/apaga pastas e arquivos; cada um comenta em nome próprio.
  Uma conta do Supabase sem perfil no mural (por exemplo, de outro projeto seu) não vê nada.
- **Feed por triggers**: o banco registra sozinho cada pasta criada, arquivo enviado,
  nova versão e comentário. O site não consegue escrever no feed.
- **Lixeira de 30 dias**: apagar move para a lixeira (aba *Lixeira*, só para admins),
  de onde dá para restaurar. Ninguém apaga de vez direto pela API; depois de 30 dias
  o próprio site faz a faxina quando um admin abre o mural.
- **Arquivos privados**: o bucket só entrega arquivos por links temporários (1 minuto)
  a quem é membro.

- **CSP no site publicado**: a página só roda o próprio código e só conversa com o
  Supabase configurado (`vite.config.ts`). Comentários e nomes de arquivo são sempre
  mostrados como texto, nunca como HTML.
- **Páginas HTML isoladas**: um `.html` enviado abre dentro do mural num iframe com
  `sandbox="allow-scripts"` (sem `allow-same-origin`), pelo `public/visualizar.html`.
  A página roda os próprios scripts, estilos e fontes, mas numa origem isolada: não lê
  a sessão nem os dados do mural, não muda a aba do portal e não envia nada para
  servidor nenhum (`connect-src 'none'`, `form-action 'none'`).

Essas regras têm testes em `supabase/tests/` e rodam no CI a cada PR.

## Colocar no ar

### 1. Supabase (no projeto que você já tem)

1. **SQL Editor**: cole e rode, nesta ordem, cada arquivo de `supabase/migrations/`
   (`20261026120000_mural.sql`, `20261027120000_seguranca.sql` e
   `20261027150000_login_por_email.sql`). Eles criam o
   schema `mural`, as tabelas, as regras, a lixeira e o bucket `mural`. Nada é criado
   fora do schema `mural` além do bucket.
2. **Project Settings > Data API > Exposed schemas**: adicione `mural`.
3. **Authentication > Users > Add user > Create new user**: crie a conta de cada pessoa
   (e-mail, marcando *Auto Confirm User*; a senha pode ser qualquer uma longa, ninguém usa).
4. **SQL Editor**: libere cada pessoa no mural:

   ```sql
   insert into mural.profiles (id, name, role)
   select id, 'Hugo Ferreira', 'admin' from auth.users where email = 'seu@email.com';

   insert into mural.profiles (id, name, role)
   select id, 'Sander Gandolfi', 'socio' from auth.users where email = 'email-do-sander';

   insert into mural.profiles (id, name, role)
   select id, 'José Oliveira', 'socio' from auth.users where email = 'email-do-ze';
   ```

5. **Project Settings > API Keys**: copie a URL do projeto e a chave *publishable*
   (ou a *anon*, nos projetos antigos). Essa chave pode ficar pública: quem protege os
   dados é o RLS. **Nunca** use a chave *secret* / *service_role* no site.

### 2. GitHub Pages

1. **Settings > Pages > Source**: escolha *GitHub Actions*.
2. **Settings > Secrets and variables > Actions > Variables**: crie
   `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` com os valores do passo anterior.
3. Rode o workflow **Publicar no GitHub Pages** (aba Actions) ou faça um merge na `main`.
   O site fica em `https://hg176.github.io/Mural-AgroMRO/`.

Mande o link para o Sander e o Zé. Eles entram com o próprio e-mail e não precisam de conta no GitHub.

> Se o seu outro projeto permite cadastro aberto, alguém pode criar conta no seu
> Supabase, mas vai cair na tela "Acesso ainda não liberado": sem linha em
> `mural.profiles`, o RLS não entrega nada.

### 3. Login por e-mail (obrigatório)

- **Authentication > URL Configuration > Redirect URLs**: adicione
  `https://hg176.github.io/Mural-AgroMRO/**`. Sem isso, o link do e-mail leva para a
  *Site URL* do projeto (que pode ser o seu outro sistema).
- **Authentication > SMTP Settings**: o e-mail padrão do Supabase só envia para quem é
  da equipe do projeto no painel e no máximo 2 por hora. Para o Sander e o Zé receberem
  o link, configure um SMTP próprio (por exemplo, Resend no plano grátis ou uma senha de
  app do Gmail). Se o outro projeto já tem SMTP configurado, não precisa fazer nada.
- **Authentication > Emails > Magic Link**: troque o assunto para `Seu acesso ao Mural AgroMRO`
  e o corpo pelo conteúdo de `supabase/templates/magic_link.html`. Ele traz o **código**
  (`{{ .Token }}`) que a pessoa digita no computador quando abre o e-mail no celular, além
  do link. Esse modelo vale para o projeto inteiro, inclusive o outro sistema.

### 4. Ajustes de segurança no Supabase

Feitos no painel, uma vez:

- **Authentication > Sign In / Providers**: desligue *Allow new users to sign up*
  (se o outro projeto que divide este Supabase não precisar de cadastro aberto).
  Os sócios são criados à mão no passo 1.3.
- **O e-mail é a chave do mural**: quem entra no e-mail de um sócio entra no mural.
  Vale ligar a verificação em 2 etapas no próprio e-mail (Gmail, Outlook).
- Contas antigas ainda têm senha (o Supabase aceita senha pela API). Se quiser fechar
  essa porta, troque a senha de cada uma por uma bem longa e aleatória em
  **Authentication > Users**.
- **Chave secreta** (*secret* / *service_role*): fica só no painel e em servidores seus,
  nunca no site nem no repositório. Quem a tem ignora o RLS e lê tudo.
- O ideal é o mural ter um **projeto Supabase só dele**: assim, um problema no outro
  sistema (ou a chave secreta dele) não alcança os arquivos dos sócios.

## Desenvolvendo

Precisa de Node 22 e Docker.

```bash
npm install
npx supabase start          # Supabase local, já com a migração aplicada
node scripts/dados-demo.mjs # sócios e conteúdo de exemplo
cp .env.example .env.local
npm run dev                 # http://localhost:5173
```

Para entrar, peça o link com `hugo@mural.test`, `sander@mural.test` ou `ze@mural.test`
e abra o e-mail no Mailpit local: http://127.0.0.1:54324.

Testes das regras do banco: `npx supabase test db`. Lint e build: `npm run lint && npm run build`.

Mudou o banco? Crie um arquivo novo em `supabase/migrations/` (não edite o antigo depois
que ele estiver em produção), rode `npx supabase db reset` e os testes, e no Supabase de
produção rode o arquivo novo no SQL Editor.

## Organização

```
supabase/migrations/   banco: tabelas, RLS, triggers do feed, bucket
supabase/tests/        testes das regras de acesso (pgTAP)
src/lib/api.ts         todas as consultas e ações (React Query + supabase-js)
src/lib/auth.tsx       sessão e perfil de quem está logado
src/components/        peças de tela (feed, comentários, lista de arquivos...)
src/pages/             telas: Início, Novidades, Arquivos, Login
scripts/dados-demo.mjs dados de exemplo para o Supabase local
```

Para um novo tipo de evento no feed: adicione o tipo no `check` de `mural.activities`
(numa migração nova), grave-o num trigger e dê uma frase e um ícone a ele em
`src/components/ActivityItem.tsx`.

## Ideias para as próximas versões

- Feed ao vivo com Supabase Realtime.
- Resumo semanal por e-mail.
- Histórico de versões de cada arquivo (hoje a versão anterior é substituída).
- Página de roadmap/marcos do AgroMRO.
- Busca e menções (@Sander) nos comentários.
