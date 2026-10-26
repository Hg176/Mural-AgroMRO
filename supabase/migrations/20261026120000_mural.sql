-- Mural AgroMRO
--
-- Tudo fica no schema "mural" para não se misturar com outros projetos que
-- usam o mesmo Supabase. O navegador fala direto com o banco, então as
-- regras de acesso (RLS) abaixo são a segurança do sistema.
--
-- Quem pode entrar: só quem tem linha em mural.profiles. Ter conta no
-- Supabase Auth (por exemplo, de outro projeto) não basta.

create schema if not exists mural;

grant usage on schema mural to anon, authenticated, service_role;

create type mural.role as enum ('admin', 'socio');

-------------------------------------------------------------------------------
-- Tabelas
-------------------------------------------------------------------------------

create table mural.profiles (
    id uuid primary key references auth.users on delete cascade,
    name text not null check (char_length(name) between 1 and 120),
    role mural.role not null default 'socio',
    feed_seen_at timestamptz,
    created_at timestamptz not null default now()
);

comment on table mural.profiles is 'Quem tem acesso ao mural. Admin publica; sócio vê, baixa e comenta.';

-- Uma pasta é um tema (Estudos, Desenvolvimento...) com sua própria conversa.
create table mural.folders (
    id bigint generated always as identity primary key,
    parent_id bigint references mural.folders on delete cascade,
    name text not null check (char_length(name) between 1 and 120),
    description text check (char_length(description) <= 500),
    created_by uuid default auth.uid() references mural.profiles on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index on mural.folders (parent_id);

create table mural.documents (
    id bigint generated always as identity primary key,
    folder_id bigint not null references mural.folders on delete cascade,
    uploaded_by uuid default auth.uid() references mural.profiles on delete set null,
    name text not null check (char_length(name) between 1 and 255),
    path text not null unique,
    mime_type text,
    size bigint not null check (size >= 0),
    version int not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index on mural.documents (folder_id);

create table mural.comments (
    id bigint generated always as identity primary key,
    folder_id bigint not null references mural.folders on delete cascade,
    user_id uuid not null default auth.uid() references mural.profiles on delete cascade,
    body text not null check (char_length(trim(body)) between 1 and 5000),
    created_at timestamptz not null default now()
);

create index on mural.comments (folder_id, created_at);

-- Linha do tempo. Só os triggers escrevem aqui. "properties" guarda um
-- retrato do item para o feed continuar legível depois que ele for apagado.
create table mural.activities (
    id bigint generated always as identity primary key,
    type text not null check (type in (
        'folder.created', 'folder.deleted',
        'document.uploaded', 'document.replaced', 'document.deleted',
        'comment.posted'
    )),
    user_id uuid references mural.profiles on delete set null,
    folder_id bigint references mural.folders on delete set null,
    subject_id bigint,
    properties jsonb not null default '{}',
    created_at timestamptz not null default now()
);

create index on mural.activities (created_at desc);

-------------------------------------------------------------------------------
-- Quem é quem
-------------------------------------------------------------------------------

create function mural.is_member() returns boolean
language sql stable security definer set search_path = ''
as $$
    select exists (select 1 from mural.profiles where id = (select auth.uid()));
$$;

create function mural.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
    select exists (select 1 from mural.profiles where id = (select auth.uid()) and role = 'admin');
$$;

-------------------------------------------------------------------------------
-- Regras de acesso (RLS)
-------------------------------------------------------------------------------

alter table mural.profiles enable row level security;
alter table mural.folders enable row level security;
alter table mural.documents enable row level security;
alter table mural.comments enable row level security;
alter table mural.activities enable row level security;

-- Perfis: membros veem os nomes uns dos outros; cada um só marca o próprio
-- "feed visto". Criar e promover pessoas é feito pelo painel do Supabase.
create policy "membros veem perfis" on mural.profiles
    for select to authenticated using (mural.is_member());
create policy "cada um atualiza o próprio perfil" on mural.profiles
    for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Pastas e documentos: membros leem, só o admin escreve.
create policy "membros veem pastas" on mural.folders
    for select to authenticated using (mural.is_member());
create policy "admin cria pastas" on mural.folders
    for insert to authenticated with check (mural.is_admin());
create policy "admin edita pastas" on mural.folders
    for update to authenticated using (mural.is_admin()) with check (mural.is_admin());
create policy "admin apaga pastas" on mural.folders
    for delete to authenticated using (mural.is_admin());

create policy "membros veem documentos" on mural.documents
    for select to authenticated using (mural.is_member());
create policy "admin envia documentos" on mural.documents
    for insert to authenticated with check (mural.is_admin());
create policy "admin troca documentos" on mural.documents
    for update to authenticated using (mural.is_admin()) with check (mural.is_admin());
create policy "admin apaga documentos" on mural.documents
    for delete to authenticated using (mural.is_admin());

-- Comentários: todo membro comenta em nome próprio; apaga o seu, admin modera.
create policy "membros veem comentários" on mural.comments
    for select to authenticated using (mural.is_member());
create policy "membros comentam em nome próprio" on mural.comments
    for insert to authenticated with check (mural.is_member() and user_id = (select auth.uid()));
create policy "autor ou admin apaga comentário" on mural.comments
    for delete to authenticated using (user_id = (select auth.uid()) or mural.is_admin());

create policy "membros veem o feed" on mural.activities
    for select to authenticated using (mural.is_member());

-- Permissões de tabela (o RLS acima filtra as linhas).
grant select on all tables in schema mural to authenticated;
grant update (feed_seen_at) on mural.profiles to authenticated;
grant insert, update (parent_id, name, description, updated_at), delete on mural.folders to authenticated;
grant insert, update (name, path, mime_type, size, version, updated_at), delete on mural.documents to authenticated;
grant insert (folder_id, body), delete on mural.comments to authenticated;
grant execute on function mural.is_member(), mural.is_admin() to authenticated;
grant all on all tables in schema mural to service_role;

-------------------------------------------------------------------------------
-- Feed automático
-------------------------------------------------------------------------------

create function mural.record_activity(
    p_type text, p_folder_id bigint, p_subject_id bigint, p_properties jsonb, p_user_id uuid
) returns void
language sql security definer set search_path = ''
as $$
    insert into mural.activities (type, folder_id, subject_id, properties, user_id)
    values (p_type, p_folder_id, p_subject_id, p_properties, coalesce((select auth.uid()), p_user_id));
$$;

revoke execute on function mural.record_activity from public, anon, authenticated;

create function mural.on_folder_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
    if tg_op = 'INSERT' then
        perform mural.record_activity('folder.created', new.id, new.id,
            jsonb_build_object('name', new.name), new.created_by);
        return new;
    end if;

    -- Apagar uma pasta leva as subpastas em cascata; só a de cima vira notícia.
    -- Numa subpasta apagada em cascata, a pasta-mãe já não existe mais.
    if old.parent_id is not null and not exists (select 1 from mural.folders where id = old.parent_id) then
        return old;
    end if;

    perform mural.record_activity('folder.deleted', old.parent_id, old.id,
        jsonb_build_object('name', old.name), null);
    return old;
end;
$$;

create trigger folder_activity after insert or delete on mural.folders
    for each row execute function mural.on_folder_change();

create function mural.on_document_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
    v_doc mural.documents;
    v_type text;
begin
    if tg_op = 'UPDATE' then
        -- Renomear não é notícia; trocar o arquivo (nova versão) é.
        if new.path is not distinct from old.path then
            return new;
        end if;
        v_doc := new;
        v_type := 'document.replaced';
    elsif tg_op = 'INSERT' then
        v_doc := new;
        v_type := 'document.uploaded';
    else
        if not exists (select 1 from mural.folders where id = old.folder_id) then
            return old; -- veio da pasta apagada, que já gerou a notícia
        end if;
        v_doc := old;
        v_type := 'document.deleted';
    end if;

    perform mural.record_activity(v_type, v_doc.folder_id, v_doc.id,
        jsonb_build_object(
            'name', v_doc.name,
            'version', v_doc.version,
            'folder', (select name from mural.folders where id = v_doc.folder_id)
        ),
        v_doc.uploaded_by);

    return coalesce(new, old);
end;
$$;

create trigger document_activity after insert or update or delete on mural.documents
    for each row execute function mural.on_document_change();

create function mural.on_comment_insert() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
    perform mural.record_activity('comment.posted', new.folder_id, new.id,
        jsonb_build_object(
            'name', (select name from mural.folders where id = new.folder_id),
            'excerpt', left(new.body, 140)
        ),
        new.user_id);
    return new;
end;
$$;

create trigger comment_activity after insert on mural.comments
    for each row execute function mural.on_comment_insert();

create function mural.touch_updated_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
    if new.updated_at is not distinct from old.updated_at then
        new.updated_at := now();
    end if;
    return new;
end;
$$;

create trigger folders_touch before update on mural.folders
    for each row execute function mural.touch_updated_at();
create trigger documents_touch before update on mural.documents
    for each row execute function mural.touch_updated_at();

-------------------------------------------------------------------------------
-- Consultas de apoio
-------------------------------------------------------------------------------

-- Caminhos no Storage de todos os arquivos de uma pasta e subpastas, para o
-- site limpar o bucket antes de apagar a pasta. Respeita o RLS (invoker).
create function mural.folder_document_paths(p_folder_id bigint) returns setof text
language sql stable set search_path = ''
as $$
    with recursive tree as (
        select id from mural.folders where id = p_folder_id
        union all
        select f.id from mural.folders f join tree t on f.parent_id = t.id
    )
    select d.path from mural.documents d join tree t on d.folder_id = t.id;
$$;

grant execute on function mural.folder_document_paths(bigint) to authenticated;

-------------------------------------------------------------------------------
-- Arquivos (Supabase Storage)
-------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('mural', 'mural', false, 52428800)
on conflict (id) do nothing;

create policy "mural: membros baixam" on storage.objects
    for select to authenticated using (bucket_id = 'mural' and mural.is_member());
create policy "mural: admin envia" on storage.objects
    for insert to authenticated with check (bucket_id = 'mural' and mural.is_admin());
create policy "mural: admin substitui" on storage.objects
    for update to authenticated using (bucket_id = 'mural' and mural.is_admin());
create policy "mural: admin apaga" on storage.objects
    for delete to authenticated using (bucket_id = 'mural' and mural.is_admin());
