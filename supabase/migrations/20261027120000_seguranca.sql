-- Mural AgroMRO: login em 2 etapas obrigatório e lixeira de 30 dias.
--
-- Em produção, cole este arquivo no SQL Editor depois do 20261026120000_mural.sql.

-------------------------------------------------------------------------------
-- Login em 2 etapas
-------------------------------------------------------------------------------

-- O banco só entrega dados a quem confirmou o login com o código do app
-- autenticador (aal2). Só a senha (aal1) não basta, nem com perfil no mural.
create or replace function mural.is_member() returns boolean
language sql stable security definer set search_path = ''
as $$
    select (select auth.jwt() ->> 'aal') = 'aal2'
       and exists (select 1 from mural.profiles where id = (select auth.uid()));
$$;

create or replace function mural.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
    select (select auth.jwt() ->> 'aal') = 'aal2'
       and exists (select 1 from mural.profiles where id = (select auth.uid()) and role = 'admin');
$$;

-- Antes do código, o site precisa saber se a pessoa é do mural (para pedir o
-- código) ou não (para mostrar "acesso não liberado"). Só a própria linha.
create policy "cada um vê o próprio perfil" on mural.profiles
    for select to authenticated using (id = (select auth.uid()));

-------------------------------------------------------------------------------
-- Lixeira
-------------------------------------------------------------------------------

-- Apagar = mover para a lixeira. Pasta e tudo o que estava dentro dela recebem
-- o mesmo deleted_at, que é como a restauração sabe o que trazer de volta.
alter table mural.folders
    add column deleted_at timestamptz,
    add column deleted_by uuid references mural.profiles on delete set null;
alter table mural.documents
    add column deleted_at timestamptz,
    add column deleted_by uuid references mural.profiles on delete set null;

create index on mural.folders (deleted_at) where deleted_at is not null;
create index on mural.documents (deleted_at) where deleted_at is not null;

-- O que está na lixeira some do mural. Comentários somem junto com a pasta
-- (a subconsulta em folders já passa pelo RLS acima).
drop policy "membros veem pastas" on mural.folders;
create policy "membros veem pastas" on mural.folders
    for select to authenticated using (mural.is_member() and deleted_at is null);

drop policy "membros veem documentos" on mural.documents;
create policy "membros veem documentos" on mural.documents
    for select to authenticated using (mural.is_member() and deleted_at is null);

drop policy "membros veem comentários" on mural.comments;
create policy "membros veem comentários" on mural.comments
    for select to authenticated using (mural.is_member() and exists (select 1 from mural.folders f where f.id = folder_id));

drop policy "membros comentam em nome próprio" on mural.comments;
create policy "membros comentam em nome próprio" on mural.comments
    for insert to authenticated
    with check (mural.is_member() and user_id = (select auth.uid()) and exists (select 1 from mural.folders f where f.id = folder_id));

-- Nada é apagado de vez direto pelo site: só pelas funções abaixo.
drop policy "admin apaga pastas" on mural.folders;
drop policy "admin apaga documentos" on mural.documents;
revoke delete on mural.folders, mural.documents from authenticated;

-- Mover para a lixeira não muda a data do arquivo (a lista de recentes não embaralha).
create or replace function mural.touch_updated_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
    if new.deleted_at is distinct from old.deleted_at then
        return new;
    end if;
    if new.updated_at is not distinct from old.updated_at then
        new.updated_at := now();
    end if;
    return new;
end;
$$;

-- Feed: apagar e restaurar agora são registrados pelas funções da lixeira;
-- a exclusão definitiva (depois de 30 dias) não vira notícia.
alter table mural.activities drop constraint activities_type_check;
alter table mural.activities add constraint activities_type_check check (type in (
    'folder.created', 'folder.deleted', 'folder.restored',
    'document.uploaded', 'document.replaced', 'document.deleted', 'document.restored',
    'comment.posted'
));

create or replace function mural.on_folder_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
    perform mural.record_activity('folder.created', new.id, new.id,
        jsonb_build_object('name', new.name), new.created_by);
    return new;
end;
$$;

drop trigger folder_activity on mural.folders;
create trigger folder_activity after insert on mural.folders
    for each row execute function mural.on_folder_change();

create or replace function mural.on_document_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
    -- Renomear ou mover para a lixeira não é "nova versão"; trocar o arquivo é.
    if tg_op = 'UPDATE' and new.path is not distinct from old.path then
        return new;
    end if;

    perform mural.record_activity(
        case tg_op when 'INSERT' then 'document.uploaded' else 'document.replaced' end,
        new.folder_id, new.id,
        jsonb_build_object(
            'name', new.name,
            'version', new.version,
            'folder', (select name from mural.folders where id = new.folder_id)
        ),
        new.uploaded_by);
    return new;
end;
$$;

drop trigger document_activity on mural.documents;
create trigger document_activity after insert or update on mural.documents
    for each row execute function mural.on_document_change();

-- Substituída pela purge_trash().
drop function mural.folder_document_paths(bigint);

create function mural.require_admin() returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
    if not mural.is_admin() then
        raise exception 'Só administradores mexem na lixeira.' using errcode = '42501';
    end if;
end;
$$;

create function mural.trash_folder(p_id bigint) returns void
language plpgsql security definer set search_path = ''
as $$
declare
    v_folder mural.folders;
    v_now timestamptz := clock_timestamp();
begin
    perform mural.require_admin();
    select * into v_folder from mural.folders where id = p_id and deleted_at is null;
    if not found then
        raise exception 'Pasta não encontrada.' using errcode = 'P0002';
    end if;

    with recursive tree as (
        select id from mural.folders where id = p_id
        union all
        select f.id from mural.folders f join tree t on f.parent_id = t.id where f.deleted_at is null
    ), trashed_documents as (
        update mural.documents set deleted_at = v_now, deleted_by = auth.uid()
        where folder_id in (select id from tree) and deleted_at is null
    )
    update mural.folders set deleted_at = v_now, deleted_by = auth.uid()
    where id in (select id from tree);

    perform mural.record_activity('folder.deleted', v_folder.parent_id, p_id,
        jsonb_build_object('name', v_folder.name), null);
end;
$$;

create function mural.restore_folder(p_id bigint) returns void
language plpgsql security definer set search_path = ''
as $$
declare
    v_folder mural.folders;
begin
    perform mural.require_admin();
    select * into v_folder from mural.folders where id = p_id and deleted_at is not null;
    if not found then
        raise exception 'Este item não está mais na lixeira.' using errcode = 'P0002';
    end if;
    if exists (select 1 from mural.folders where id = v_folder.parent_id and deleted_at is not null) then
        raise exception 'A pasta onde ela ficava também está na lixeira. Restaure aquela primeiro.' using errcode = 'P0001';
    end if;

    -- Só volta o que foi apagado junto com ela; o que já estava na lixeira antes fica lá.
    with recursive tree as (
        select id from mural.folders where id = p_id
        union all
        select f.id from mural.folders f join tree t on f.parent_id = t.id where f.deleted_at = v_folder.deleted_at
    ), restored_documents as (
        update mural.documents set deleted_at = null, deleted_by = null
        where folder_id in (select id from tree) and deleted_at = v_folder.deleted_at
    )
    update mural.folders set deleted_at = null, deleted_by = null
    where id in (select id from tree);

    perform mural.record_activity('folder.restored', p_id, p_id,
        jsonb_build_object('name', v_folder.name), null);
end;
$$;

create function mural.trash_document(p_id bigint) returns void
language plpgsql security definer set search_path = ''
as $$
declare
    v_document mural.documents;
begin
    perform mural.require_admin();
    update mural.documents set deleted_at = clock_timestamp(), deleted_by = auth.uid()
    where id = p_id and deleted_at is null
    returning * into v_document;
    if not found then
        raise exception 'Arquivo não encontrado.' using errcode = 'P0002';
    end if;

    perform mural.record_activity('document.deleted', v_document.folder_id, p_id,
        jsonb_build_object(
            'name', v_document.name,
            'version', v_document.version,
            'folder', (select name from mural.folders where id = v_document.folder_id)
        ),
        null);
end;
$$;

create function mural.restore_document(p_id bigint) returns void
language plpgsql security definer set search_path = ''
as $$
declare
    v_document mural.documents;
begin
    perform mural.require_admin();
    select * into v_document from mural.documents where id = p_id and deleted_at is not null;
    if not found then
        raise exception 'Este item não está mais na lixeira.' using errcode = 'P0002';
    end if;
    if exists (select 1 from mural.folders where id = v_document.folder_id and deleted_at is not null) then
        raise exception 'A pasta deste arquivo também está na lixeira. Restaure a pasta primeiro.' using errcode = 'P0001';
    end if;

    update mural.documents set deleted_at = null, deleted_by = null where id = p_id;

    perform mural.record_activity('document.restored', v_document.folder_id, p_id,
        jsonb_build_object(
            'name', v_document.name,
            'version', v_document.version,
            'folder', (select name from mural.folders where id = v_document.folder_id)
        ),
        null);
end;
$$;

-- O que aparece na lixeira: o item que foi apagado, não cada coisa que estava dentro dele.
create function mural.trash_items()
returns table (
    kind text, id bigint, name text, location text, size bigint,
    deleted_at timestamptz, deleted_by_name text, items_inside bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
    perform mural.require_admin();
    return query
    select 'folder', f.id, f.name, parent.name, null::bigint, f.deleted_at, p.name,
           (select count(*) from mural.documents d where d.deleted_at = f.deleted_at)
    from mural.folders f
    left join mural.folders parent on parent.id = f.parent_id
    left join mural.profiles p on p.id = f.deleted_by
    where f.deleted_at is not null
      and parent.deleted_at is distinct from f.deleted_at
    union all
    select 'document', d.id, d.name, folder.name, d.size, d.deleted_at, p.name, null
    from mural.documents d
    join mural.folders folder on folder.id = d.folder_id
    left join mural.profiles p on p.id = d.deleted_by
    where d.deleted_at is not null
      and folder.deleted_at is distinct from d.deleted_at
    order by 6 desc;
end;
$$;

-- Exclusão definitiva: de um item da lixeira (p_kind + p_id) ou, sem
-- argumentos, de tudo o que está lá há mais de 30 dias. Devolve os caminhos
-- no Storage para o site apagar os arquivos.
create function mural.purge_trash(p_kind text default null, p_id bigint default null) returns setof text
language plpgsql security definer set search_path = ''
as $$
declare
    v_cutoff timestamptz := now() - interval '30 days';
    v_path text;
begin
    perform mural.require_admin();

    if p_kind = 'folder' then
        if not exists (select 1 from mural.folders where id = p_id and deleted_at is not null) then
            raise exception 'Este item não está na lixeira.' using errcode = 'P0002';
        end if;
        return query
        with recursive tree as (
            select id from mural.folders where id = p_id
            union all
            select f.id from mural.folders f join tree t on f.parent_id = t.id
        )
        select d.path from mural.documents d where d.folder_id in (select id from tree);
        delete from mural.folders where id = p_id;
    elsif p_kind = 'document' then
        for v_path in delete from mural.documents where id = p_id and deleted_at is not null returning path loop
            return next v_path;
        end loop;
        if not found then
            raise exception 'Este item não está na lixeira.' using errcode = 'P0002';
        end if;
    else
        -- Tudo dentro de uma pasta expirada foi para a lixeira junto ou antes dela.
        for v_path in delete from mural.documents where deleted_at < v_cutoff returning path loop
            return next v_path;
        end loop;
        delete from mural.folders where deleted_at < v_cutoff;
    end if;
end;
$$;

revoke execute on function mural.require_admin(), mural.trash_folder(bigint), mural.restore_folder(bigint),
    mural.trash_document(bigint), mural.restore_document(bigint), mural.trash_items(), mural.purge_trash(text, bigint)
    from public, anon;
grant execute on function mural.trash_folder(bigint), mural.restore_folder(bigint),
    mural.trash_document(bigint), mural.restore_document(bigint), mural.trash_items(), mural.purge_trash(text, bigint)
    to authenticated;
