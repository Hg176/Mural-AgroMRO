import { Link } from 'react-router-dom'
import { plural } from '../lib/format'
import type { FolderSummary } from '../lib/types'
import { Icon } from './Icon'

export function FolderCard({ folder }: { folder: FolderSummary }) {
  const documents = folder.documents[0]?.count ?? 0
  const comments = folder.comments[0]?.count ?? 0
  const children = folder.children[0]?.count ?? 0

  return (
    <Link
      to={`/arquivos/${folder.id}`}
      className="group flex flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-emerald-300"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <Icon name="folder" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-stone-900 group-hover:text-emerald-800">{folder.name}</h3>
          {folder.description && <p className="mt-0.5 line-clamp-2 text-sm text-stone-500">{folder.description}</p>}
        </div>
      </div>
      <div className="mt-4 flex gap-4 text-xs text-stone-500">
        {children > 0 && (
          <span className="flex items-center gap-1">
            <Icon name="folder" className="size-3.5" /> {children}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Icon name="file" className="size-3.5" /> {plural(documents, 'arquivo')}
        </span>
        <span className="flex items-center gap-1">
          <Icon name="comment" className="size-3.5" /> {comments}
        </span>
      </div>
    </Link>
  )
}
