import { DocumentRowsSkeleton } from '../components/Skeleton'
import { Icon } from '../components/Icon'
import { RelativeTime } from '../components/RelativeTime'
import { TRASH_DAYS, usePurge, useRestore, useTrash } from '../lib/api'
import { fileSize, plural } from '../lib/format'
import type { TrashItem } from '../lib/types'

const DAY = 86_400_000

function daysLeft(item: TrashItem): number {
  const expires = new Date(item.deleted_at).getTime() + TRASH_DAYS * DAY
  return Math.max(0, Math.ceil((expires - Date.now()) / DAY))
}

/** O que foi apagado fica aqui por 30 dias e pode voltar para o lugar. */
export function TrashPage() {
  const { data: items = [], isLoading } = useTrash()
  const restore = useRestore()
  const purge = usePurge()
  const error = restore.error ?? purge.error

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">Lixeira</h1>
        <p className="text-sm text-stone-500">
          Pastas e arquivos apagados ficam aqui por {TRASH_DAYS} dias. Depois disso, somem para sempre.
        </p>
      </div>

      {error && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error.message}</p>}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200">
        {isLoading && <DocumentRowsSkeleton />}
        {!isLoading && items.length === 0 && (
          <p className="flex flex-col items-center gap-2 px-5 py-12 text-center text-sm text-stone-500">
            <Icon name="trash" className="size-8 text-stone-300" />
            A lixeira está vazia.
          </p>
        )}
        <ul className="divide-y divide-stone-100">
          {items.map((item) => {
            const left = daysLeft(item)
            return (
              <li key={`${item.kind}-${item.id}`} className="flex flex-wrap items-center gap-4 px-5 py-3">
                <span className={`flex h-10 w-12 shrink-0 items-center justify-center rounded-md ${item.kind === 'folder' ? 'bg-amber-100 text-amber-700' : 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'}`}>
                  <Icon name={item.kind === 'folder' ? 'folder' : 'file'} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-stone-800">{item.name}</p>
                  <p className="text-xs text-stone-500">
                    {item.kind === 'folder' ? `Pasta${item.items_inside ? ` com ${plural(item.items_inside, 'arquivo')}` : ''}` : fileSize(item.size ?? 0)}
                    {item.location && <> · estava em {item.location}</>}
                    {' · '}apagado por {item.deleted_by_name ?? 'alguém'} <RelativeTime date={item.deleted_at} />
                  </p>
                  <p className={`text-xs ${left <= 3 ? 'font-medium text-rose-600' : 'text-stone-400'}`}>
                    {left === 0 ? 'Será apagado de vez hoje' : `Some para sempre em ${plural(left, 'dia')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => restore.mutate(item)}
                    disabled={restore.isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    <Icon name="undo" className="size-4" /> Restaurar
                  </button>
                  <button
                    onClick={() => confirm(`Apagar ${item.name} para sempre? Isso não pode ser desfeito.`) && purge.mutate(item)}
                    disabled={purge.isPending}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-rose-50 hover:text-rose-600"
                  >
                    Apagar para sempre
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
