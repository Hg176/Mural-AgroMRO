-- Regras de acesso e feed do mural. Rode com: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- Pessoas: Hugo (admin), Sander (sócio) e alguém de OUTRO projeto do mesmo Supabase.
insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-00000000000a', 'hugo@teste'),
    ('00000000-0000-0000-0000-00000000000b', 'sander@teste'),
    ('00000000-0000-0000-0000-00000000000c', 'estranho@teste');
insert into mural.profiles (id, name, role) values
    ('00000000-0000-0000-0000-00000000000a', 'Hugo', 'admin'),
    ('00000000-0000-0000-0000-00000000000b', 'Sander', 'socio');

create function pg_temp.act_as(p_id text) returns void language sql as $$
    select set_config('role', 'authenticated', true),
           set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
    select set_config('role', 'postgres', true);
$$;

-- Admin ----------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

select lives_ok($$ insert into mural.folders (name) values ('Estudos') $$, 'admin cria pasta');
select lives_ok($$ insert into mural.folders (name, parent_id) select 'Multi-tenancy', id from mural.folders where name = 'Estudos' $$, 'admin cria subpasta');
select is((select created_by from mural.folders where name = 'Estudos'), '00000000-0000-0000-0000-00000000000a'::uuid, 'criador vem do login');
select lives_ok($$ insert into mural.documents (folder_id, name, path, size) select id, 'semana-44.pdf', 'docs/a.pdf', 100 from mural.folders where name = 'Estudos' $$, 'admin envia documento');
select lives_ok($$ insert into mural.documents (folder_id, name, path, size) select id, 'teste.pdf', 'docs/sub.pdf', 10 from mural.folders where name = 'Multi-tenancy' $$, 'admin envia na subpasta');
select lives_ok($$ update mural.documents set path = 'docs/a-v2.pdf', version = version + 1 where name = 'semana-44.pdf' $$, 'admin envia nova versão');
select lives_ok($$ update mural.documents set name = 'semana-44-final.pdf' where path = 'docs/a-v2.pdf' $$, 'admin renomeia');
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('mural', 'docs/a.pdf') $$, 'admin grava no bucket');

-- Feed gerado pelos triggers
select is((select count(*)::int from mural.activities where type = 'folder.created'), 2, 'pastas criadas entram no feed');
select is((select count(*)::int from mural.activities where type = 'document.uploaded'), 2, 'uploads entram no feed');
select is((select count(*)::int from mural.activities where type = 'document.replaced'), 1, 'nova versão entra no feed, renomear não');
select is((select properties->>'folder' from mural.activities where type = 'document.uploaded' order by id limit 1), 'Estudos', 'feed guarda o nome da pasta');
select is((select user_id from mural.activities where type = 'document.replaced'), '00000000-0000-0000-0000-00000000000a'::uuid, 'autor da nova versão é quem está logado');

-- Sócio ----------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');

select is((select count(*)::int from mural.folders), 2, 'sócio vê as pastas');
select is((select count(*)::int from mural.documents), 2, 'sócio vê os documentos');
select is((select count(*)::int from storage.objects where bucket_id = 'mural'), 1, 'sócio baixa do bucket');
select throws_ok($$ insert into mural.folders (name) values ('Minha pasta') $$, '42501', null, 'sócio não cria pasta');
select throws_ok($$ insert into mural.documents (folder_id, name, path, size) select id, 'x', 'docs/x', 1 from mural.folders limit 1 $$, '42501', null, 'sócio não envia documento');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('mural', 'docs/sander.pdf') $$, '42501', null, 'sócio não grava no bucket');
update mural.folders set name = 'Hackeado';
select is((select count(*)::int from mural.folders where name = 'Hackeado'), 0, 'sócio não renomeia pasta');
delete from mural.documents;
select is((select count(*)::int from mural.documents), 2, 'sócio não apaga documento');

select lives_ok($$ insert into mural.comments (folder_id, body) select id, 'Li o estudo, faz sentido.' from mural.folders where name = 'Estudos' $$, 'sócio comenta');
select throws_ok($$ insert into mural.comments (folder_id, body, user_id) select id, 'em nome do Hugo', '00000000-0000-0000-0000-00000000000a' from mural.folders limit 1 $$, '42501', null, 'sócio não comenta em nome de outro');
select is((select properties->>'excerpt' from mural.activities where type = 'comment.posted'), 'Li o estudo, faz sentido.', 'comentário entra no feed');
select is((select count(*)::int from mural.activities), 6, 'sócio lê o feed');
select throws_ok($$ insert into mural.activities (type) values ('folder.created') $$, '42501', null, 'ninguém escreve no feed na mão');
select lives_ok($$ update mural.profiles set feed_seen_at = now() where id = '00000000-0000-0000-0000-00000000000b' $$, 'sócio marca o feed como visto');
select throws_ok($$ update mural.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000b' $$, '42501', null, 'sócio não vira admin');

-- Conta de outro projeto -----------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');

select is((select count(*)::int from mural.folders) + (select count(*)::int from mural.activities) + (select count(*)::int from mural.profiles), 0, 'conta sem perfil no mural não vê nada');
select is((select count(*)::int from storage.objects where bucket_id = 'mural'), 0, 'conta sem perfil não baixa arquivos');

-- Apagar pasta -----------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

select is((select array_agg(p order by p) from mural.folder_document_paths((select id from mural.folders where name = 'Estudos')) p), array['docs/a-v2.pdf', 'docs/sub.pdf'], 'lista os arquivos da pasta e subpastas para limpar o bucket');
delete from mural.folders where name = 'Estudos';
select is((select array_agg(type order by id) from mural.activities where type like '%.deleted'), array['folder.deleted'], 'apagar pasta gera uma notícia só (sem uma por subpasta ou arquivo)');

select * from finish();
rollback;
