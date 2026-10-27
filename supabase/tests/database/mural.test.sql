-- Regras de acesso e feed do mural. Rode com: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(51);

-- Pessoas: Hugo (admin), Sander (sócio) e alguém de OUTRO projeto do mesmo Supabase.
insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-00000000000a', 'hugo@teste'),
    ('00000000-0000-0000-0000-00000000000b', 'sander@teste'),
    ('00000000-0000-0000-0000-00000000000c', 'estranho@teste');
insert into mural.profiles (id, name, role) values
    ('00000000-0000-0000-0000-00000000000a', 'Hugo', 'admin'),
    ('00000000-0000-0000-0000-00000000000b', 'Sander', 'socio');

-- Sessão de quem entrou pelo link do e-mail (aal1).
create function pg_temp.act_as(p_id text) returns void language sql as $$
    select set_config('role', 'authenticated', true),
           set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated', 'aal', 'aal1')::text, true);
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
select throws_ok($$ delete from mural.documents $$, '42501', null, 'sócio não apaga documento');
select throws_ok($$ select mural.trash_document((select min(id) from mural.documents)) $$, '42501', null, 'sócio não manda documento para a lixeira');

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

-- Lixeira ------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

select throws_ok($$ delete from mural.folders $$, '42501', null, 'nem o admin apaga de vez direto');
select lives_ok($$ select mural.trash_document((select id from mural.documents where name = 'teste.pdf')) $$, 'admin manda arquivo para a lixeira');
select lives_ok($$ select mural.trash_folder((select id from mural.folders where name = 'Estudos')) $$, 'admin manda pasta para a lixeira');
select is((select array_agg(type order by id) from mural.activities where type like '%.deleted'), array['document.deleted', 'folder.deleted'], 'apagar pasta gera uma notícia só (sem uma por subpasta ou arquivo)');
select is((select count(*)::int from mural.folders) + (select count(*)::int from mural.documents) + (select count(*)::int from mural.comments), 0, 'pasta, subpasta, arquivos e comentários somem do mural');
select is((select array_agg(kind || ':' || name order by kind) from mural.trash_items()), array['document:teste.pdf', 'folder:Estudos'], 'lixeira mostra a pasta e o arquivo apagado antes dela, não cada item de dentro');
select is((select items_inside::int from mural.trash_items() where kind = 'folder'), 1, 'lixeira conta os arquivos que foram junto com a pasta');
select throws_ok($$ select mural.restore_document((select id from mural.trash_items() where kind = 'document')) $$, 'P0001', null, 'arquivo de pasta na lixeira só volta depois da pasta');

select lives_ok($$ select mural.restore_folder((select id from mural.trash_items() where kind = 'folder')) $$, 'admin restaura a pasta');
select is((select array_agg(name order by name) from mural.folders), array['Estudos', 'Multi-tenancy'], 'pasta volta com a subpasta');
select is((select array_agg(name) from mural.documents), array['semana-44-final.pdf'], 'volta só o que foi apagado junto; o arquivo apagado antes continua na lixeira');
select is((select count(*)::int from mural.comments), 1, 'comentários voltam junto');
select is((select count(*)::int from mural.activities where type = 'folder.restored'), 1, 'restaurar entra no feed');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select throws_ok($$ select * from mural.trash_items() $$, '42501', null, 'sócio não vê a lixeira');
select throws_ok($$ select * from mural.purge_trash() $$, '42501', null, 'sócio não esvazia a lixeira');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select is((select array_agg(p) from mural.purge_trash() p), null, 'nada expira antes de 30 dias');
select pg_temp.as_postgres();
update mural.documents set deleted_at = now() - interval '31 days' where deleted_at is not null;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select is((select array_agg(p) from mural.purge_trash() p), array['docs/sub.pdf'], 'depois de 30 dias apaga de vez e devolve o arquivo para limpar o bucket');
select lives_ok($$ select mural.trash_folder((select id from mural.folders where name = 'Estudos')) $$, 'apaga a pasta de novo');
select is((select array_agg(p) from mural.purge_trash('folder', (select id from mural.trash_items() where kind = 'folder')) p), array['docs/a-v2.pdf'], 'apagar para sempre na hora devolve os arquivos da pasta');
select pg_temp.as_postgres();
select is((select count(*)::int from mural.folders), 0, 'a pasta e a subpasta saíram do banco');

select * from finish();
rollback;
