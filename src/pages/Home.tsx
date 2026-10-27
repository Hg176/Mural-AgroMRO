import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Feed } from '../components/Feed'
import { FolderCard } from '../components/FolderCard'
import { RelativeTime } from '../components/RelativeTime'
import { DocumentRowsSkeleton, FolderGridSkeleton, Skeleton } from '../components/Skeleton'
import { useFolders, useLatestDocuments, useStats } from '../lib/api'
import { useProfile } from '../lib/auth'
import { extension } from '../lib/format'

export function Home() {
  const profile = useProfile()
  // A página inicial mostra o que é novo, mas não zera o contador: isso só acontece em Novidades.
  const [seenAt] = useState(profile.feed_seen_at)
  const { data: folders = [], isLoading: loadingFolders } = useFolders(null)
  const { data: stats } = useStats()
  const { data: latest = [], isLoading: loadingLatest } = useLatestDocuments()

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
        <p className="text-sm font-medium text-emerald-700">Olá, {profile.name.split(' ')[0]}</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">Acompanhe a evolução do AgroMRO</h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Aqui ficam os estudos, as atualizações de desenvolvimento e as conversas de cada tema. Tudo o que muda aparece em{' '}
          <Link to="/novidades" className="font-medium text-emerald-800 hover:underline">Novidades</Link>.
        </p>
        <dl className="mt-5 grid grid-cols-3 gap-3 sm:max-w-md">
          {Object.entries(stats ?? { Pastas: null, Arquivos: null, Comentários: null }).map(([label, value]) => (
            <div key={label} className="rounded-lg bg-stone-50 px-4 py-3 ring-1 ring-stone-200">
              <dt className="text-xs text-stone-500">{label}</dt>
              <dd className="text-xl font-semibold text-stone-900" aria-busy={value === null}>
                {value ?? <Skeleton className="my-1 h-5 w-8" />}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-900">Últimas novidades</h2>
            <Link to="/novidades" className="text-sm font-medium text-emerald-800 hover:underline">Ver tudo</Link>
          </div>
          <Feed compact seenAt={seenAt} />
        </section>

        <aside className="space-y-8 lg:col-span-2">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900">Temas</h2>
              <Link to="/arquivos" className="text-sm font-medium text-emerald-800 hover:underline">Abrir arquivos</Link>
            </div>
            <div className="grid gap-3">
              {loadingFolders && <FolderGridSkeleton />}
              {folders.map((folder) => <FolderCard key={folder.id} folder={folder} />)}
              {!loadingFolders && folders.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-sm text-stone-500 ring-1 ring-stone-200">Nenhuma pasta criada ainda.</p>}
            </div>
          </section>

          {loadingLatest && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-stone-900">Documentos recentes</h2>
              <div className="rounded-xl bg-white shadow-sm ring-1 ring-stone-200"><DocumentRowsSkeleton compact /></div>
            </section>
          )}

          {latest.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-stone-900">Documentos recentes</h2>
              <ul className="divide-y divide-stone-100 rounded-xl bg-white shadow-sm ring-1 ring-stone-200">
                {latest.map((document) => (
                  <li key={document.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-8 w-10 items-center justify-center rounded bg-sky-50 text-[10px] font-bold text-sky-700 ring-1 ring-sky-200">{extension(document.name)}</span>
                    <div className="min-w-0 flex-1">
                      <Link to={`/arquivos/${document.folder_id}?documento=${document.id}`} className="block truncate text-sm font-medium text-stone-800 hover:text-emerald-800">{document.name}</Link>
                      <p className="text-xs text-stone-500">{document.folder?.name} · <RelativeTime date={document.updated_at} /></p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
