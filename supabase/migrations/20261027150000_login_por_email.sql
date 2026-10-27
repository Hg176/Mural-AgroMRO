-- Mural AgroMRO: troca o login em 2 etapas pelo link no e-mail.
--
-- O link no e-mail já prova que a pessoa tem acesso à caixa de entrada, então
-- o banco deixa de exigir o código do app autenticador (aal2).
-- Em produção, cole este arquivo no SQL Editor.

create or replace function mural.is_member() returns boolean
language sql stable security definer set search_path = ''
as $$
    select exists (select 1 from mural.profiles where id = (select auth.uid()));
$$;

create or replace function mural.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
    select exists (select 1 from mural.profiles where id = (select auth.uid()) and role = 'admin');
$$;

-- Apps autenticadores cadastrados para o mural deixam de ser usados.
delete from auth.mfa_factors where friendly_name = 'Mural AgroMRO';
