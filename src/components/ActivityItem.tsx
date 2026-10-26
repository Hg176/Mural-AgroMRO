import { Link } from 'react-router-dom'
import type { Activity, ActivityType } from '../lib/types'
import { Avatar } from './Avatar'
import { Icon, type IconName } from './Icon'
import { RelativeTime } from './RelativeTime'

/** Frase e ícone de cada tipo de evento. Novo tipo no banco = nova linha aqui. */
const TYPES: Record<ActivityType, { text: string; icon: IconName; color: string }> = {
  'folder.created': { text: 'criou a pasta', icon: 'folder', color: 'bg-amber-100 text-amber-700' },
  'folder.deleted': { text: 'apagou a pasta', icon: 'folder', color: 'bg-amber-100 text-amber-700' },
  'document.uploaded': { text: 'enviou o arquivo', icon: 'file', color: 'bg-sky-100 text-sky-700' },
  'document.replaced': { text: 'enviou uma nova versão de', icon: 'file', color: 'bg-sky-100 text-sky-700' },
  'document.deleted': { text: 'apagou o arquivo', icon: 'file', color: 'bg-sky-100 text-sky-700' },
  'comment.posted': { text: 'comentou em', icon: 'comment', color: 'bg-violet-100 text-violet-700' },
}

/** Para onde o item leva. Nada quando o alvo foi apagado. */
function linkFor(activity: Activity): string | null {
  if (activity.type.endsWith('.deleted')) return null
  if (activity.folder_id === null) return null
  const anchor = activity.type.startsWith('document.') ? `?documento=${activity.subject_id}` : activity.type === 'comment.posted' ? '?comentarios' : ''
  return `/arquivos/${activity.folder_id}${anchor}`
}

export function ActivityItem({ activity, isNew }: { activity: Activity; isNew: boolean }) {
  const type = TYPES[activity.type]
  const { name, folder, version, excerpt } = activity.properties
  const link = linkFor(activity)

  return (
    <li className="flex gap-3 py-3">
      <div className="relative h-fit">
        <Avatar user={activity.user} />
        <span className={`${type.color} absolute -right-2 -bottom-1.5 flex size-5 items-center justify-center rounded-full ring-2 ring-white`}>
          <Icon name={type.icon} className="size-3" />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold">{activity.user?.name ?? 'Alguém'}</span> {type.text}{' '}
          {link ? (
            <Link to={link} className="font-medium text-emerald-800 hover:underline">
              {name}
            </Link>
          ) : (
            <span className="font-medium text-stone-500 line-through decoration-stone-300">{name}</span>
          )}
          {(version ?? 1) > 1 && <span className="ml-1 rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">v{version}</span>}
          {folder && <span className="text-stone-500"> em {folder}</span>}
          {isNew && (
            <span className="ml-1.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase">novo</span>
          )}
        </p>

        {excerpt && (
          <p className="mt-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">“{excerpt}”</p>
        )}

        <RelativeTime date={activity.created_at} className="mt-1 block text-xs text-stone-500" />
      </div>
    </li>
  )
}
