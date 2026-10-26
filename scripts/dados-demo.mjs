// Dados de demonstração para o Supabase LOCAL: os três sócios, alguns temas,
// arquivos e conversas espalhados pelos últimos dias.
//
//   npx supabase start && node scripts/dados-demo.mjs
//
// Usa a chave secreta (service role) do Supabase local. Não rode em produção:
// cria contas com a senha "password".
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const secret = process.env.SUPABASE_SECRET_KEY ?? 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'

if (!/127\.0\.0\.1|localhost/.test(url)) {
  console.error('Este script é só para o Supabase local.')
  process.exit(1)
}

const admin = createClient(url, secret, { db: { schema: 'mural' }, auth: { persistSession: false } })

async function check(promise) {
  const { data, error } = await promise
  if (error) throw new Error(error.message)
  return data
}

async function user(email, name, role, seenDaysAgo) {
  const { data } = await admin.auth.admin.createUser({ email, password: 'password', email_confirm: true })
  const id = data.user?.id ?? (await admin.auth.admin.listUsers()).data.users.find((u) => u.email === email).id
  await check(admin.from('profiles').upsert({ id, name, role, feed_seen_at: at(seenDaysAgo, '00:00') }))
  return id
}

const today = new Date()
function at(daysAgo, time) {
  if (daysAgo === null) return null
  const [h, m] = time.split(':').map(Number)
  const date = new Date(today)
  date.setDate(date.getDate() - daysAgo)
  date.setHours(h, m, 0, 0)
  return date.toISOString()
}

/** Joga a última ação para o passado, para o feed ter cara de uso real. */
async function backdate(daysAgo, time, table, id) {
  const when = at(daysAgo, time)
  const [last] = await check(admin.from('activities').select('id').order('id', { ascending: false }).limit(1))
  await check(admin.from('activities').update({ created_at: when }).eq('id', last.id))
  if (table === 'comments') await check(admin.from('comments').update({ created_at: when }).eq('id', id))
  if (table === 'documents') await check(admin.from('documents').update({ updated_at: when }).eq('id', id))
}

async function folder(name, description, parent, daysAgo, time) {
  const row = await check(admin.from('folders').insert({ name, description, parent_id: parent ?? null, created_by: hugo }).select().single())
  await backdate(daysAgo, time)
  return row.id
}

async function document(folderId, name, contents, mime, daysAgo, time) {
  const path = `documentos/${folderId}/${crypto.randomUUID()}-${name}`
  await admin.storage.from('mural').upload(path, new Blob([contents], { type: mime }), { contentType: mime })
  const row = await check(
    admin.from('documents').insert({ folder_id: folderId, name, path, mime_type: mime, size: new Blob([contents]).size, uploaded_by: hugo }).select().single(),
  )
  await backdate(daysAgo, time, 'documents', row.id)
  return row
}

async function comment(folderId, userId, body, daysAgo, time) {
  const row = await check(admin.from('comments').insert({ folder_id: folderId, user_id: userId, body }).select().single())
  await backdate(daysAgo, time, 'comments', row.id)
}

const hugo = await user('hugo@mural.test', 'Hugo Ferreira', 'admin', 0)
const sander = await user('sander@mural.test', 'Sander Gandolfi', 'socio', 3)
const ze = await user('ze@mural.test', 'José Oliveira', 'socio', null)

const estudos = await folder('Estudos', 'Pesquisas, comparativos e materiais que embasam as decisões técnicas.', null, 6, '09:10')
const desenvolvimento = await folder('Desenvolvimento', 'Atualizações semanais do que foi construído na plataforma.', null, 6, '09:12')
const decisoes = await folder('Reuniões e decisões', 'Atas, combinados e próximos passos entre os sócios.', null, 6, '09:14')

await document(estudos, 'Comparativo-multi-tenancy.md', '# Multi-tenancy\n\nBanco único com tenant_id x banco por cliente.\n', 'text/markdown', 6, '09:40')
const multitenant = await folder('Arquitetura multi-tenant', 'Estudo prático de isolamento de dados entre clientes.', estudos, 5, '14:00')
await document(multitenant, 'Testes-de-isolamento.md', '# Testes de isolamento\n\nNenhum cliente vê dados de outro.\n', 'text/markdown', 5, '14:05')
await comment(estudos, sander, 'Li o comparativo. Faz sentido começar com banco único, mas quero entender o custo de migrar depois.', 5, '18:30')
await comment(estudos, hugo, 'Boa pergunta. A migração é planejada na etapa 3 do estudo; deixo um resumo aqui quando terminar.', 4, '19:02')
await document(desenvolvimento, 'Atualizacao-semana-43.md', '# Semana 43\n\n- Cadastro de materiais MRO\n- Importação de planilhas\n', 'text/markdown', 3, '10:20')
await document(desenvolvimento, 'Cronograma-MVP.csv', 'etapa,inicio,fim\nCadastro,2026-10-01,2026-10-31\nLançamento,2027-01-04,2027-01-29\n', 'text/csv', 3, '10:25')
await document(decisoes, 'Ata-reuniao-25-10.md', '# Reunião de 25/10\n\nCombinados entre os sócios.\n', 'text/markdown', 2, '08:45')
await comment(decisoes, ze, 'Ata confere com o que combinamos. Vou levar o ponto do investimento para a próxima conversa.', 2, '11:10')
const semana44 = await document(desenvolvimento, 'Atualizacao-semana-44.md', '# Semana 44\n\n- Painel de indicadores (rascunho)\n', 'text/markdown', 1, '16:00')

// Nova versão do arquivo da semana 44
const newPath = `documentos/${desenvolvimento}/${crypto.randomUUID()}-Atualizacao-semana-44.md`
const v2 = '# Semana 44\n\n- Painel de indicadores (rascunho)\n- Filtros por categoria\n- Exportação para Excel\n'
await admin.storage.from('mural').upload(newPath, new Blob([v2], { type: 'text/markdown' }), { contentType: 'text/markdown' })
await check(admin.from('documents').update({ path: newPath, size: new Blob([v2]).size, version: 2 }).eq('id', semana44.id))
await admin.storage.from('mural').remove([semana44.path])
await backdate(0, '09:30', 'documents', semana44.id)

await comment(desenvolvimento, sander, 'A exportação para Excel vai ajudar muito na conversa com os clientes. Dá para incluir o código do fornecedor?', 0, '10:15')

console.log('Pronto: entre com hugo@mural.test, sander@mural.test ou ze@mural.test (senha "password").')
