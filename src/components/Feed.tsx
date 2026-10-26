import { useState } from 'react'
import { useFeed, type FeedFilter } from '../lib/api'
import { useProfile } from '../lib/auth'
import { dayLabel } from '../lib/format'
import type { Activity } from '../lib/types'
import { ActivityItem } from './ActivityItem'

const FILTERS: [FeedFilter, string][] = [
  ['tudo', 'Tudo'],
  ['arquivos', 'Arquivos e pastas'],
  ['comentarios', 'Comentários'],
]

/**
 * Linha do tempo. "seenAt" é a última visita, guardada ao abrir a tela, para
 * os itens continuarem marcados como novos enquanto a pessoa lê.
 */
export function Feed({ compact = false, seenAt }: { compact?: boolean; seenAt: string | null }) {
  const profile = useProfile()
  const [filter, setFilter] = useState<FeedFilter>('tudo')
  const [limit, setLimit] = useState(compact ? 8 : 30)
  const { data: activities = [], isLoading, isFetching } = useFeed(filter, limit)

  const isNew = (activity: Activity) =>
    activity.user_id !== profile.id && (seenAt === null || new Date(activity.created_at) > new Date(seenAt))

  const days = new Map<string, Activity[]>()
  for (const activity of activities) {
    const day = dayLabel(activity.created_at)
    days.set(day, [...(days.get(day) ?? []), activity])
  }

  return (
    <div>
      {!compact && (
        <div className="mb-4 flex w-fit rounded-lg bg-white p-1 shadow-sm ring-1 ring-stone-200">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${filter === value ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className={`rounded-xl bg-white shadow-sm ring-1 ring-stone-200 ${compact ? 'px-5 py-2' : 'p-5'}`}>
        {isLoading && <p className="py-10 text-center text-sm text-stone-500">Carregando...</p>}
        {!isLoading && activities.length === 0 && <p className="py-10 text-center text-sm text-stone-500">Nada por aqui ainda.</p>}

        {[...days].map(([day, items]) => (
          <section key={day}>
            <h3 className="mt-3 text-xs font-semibold tracking-wider text-stone-400 uppercase first:mt-1">{day}</h3>
            <ul className="divide-y divide-stone-100">
              {items.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} isNew={isNew(activity)} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {!compact && activities.length === limit && (
        <button
          onClick={() => setLimit(limit + 30)}
          disabled={isFetching}
          className="mt-4 w-full rounded-lg bg-white py-2 text-sm font-medium text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"
        >
          {isFetching ? 'Carregando...' : 'Ver mais antigos'}
        </button>
      )}
    </div>
  )
}
