import { useEffect } from 'react'
import { fileUrl, useDeleteDocument, useDocuments, useReplaceDocument } from '../lib/api'
import { useAuth } from '../lib/auth'
import { extension, fileSize, isPreviewable, plural } from '../lib/format'
import type { Document } from '../lib/types'
import { Icon } from './Icon'
import { RelativeTime } from './RelativeTime'
import { DocumentRowsSkeleton, Skeleton } from './Skeleton'

const ICON_BUTTON = 'rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-emerald-800'

async function open(document: Document, download: boolean) {
  const url = await fileUrl(document, download)
  if (download) window.location.assign(url)
  else window.open(url, '_blank', 'noopener')
}

export function DocumentList({ folderId, highlight, canDrop = false }: { folderId: number; highlight: number | null; canDrop?: boolean }) {
  const { isAdmin } = useAuth()
  const { data: documents = [], isLoading } = useDocuments(folderId)
  const replace = useReplaceDocument()
  const remove = useDeleteDocument()

  useEffect(() => {
    if (highlight && documents.length) document.getElementById(`documento-${highlight}`)?.scrollIntoView({ block: 'center' })
  }, [highlight, documents.length])

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200">
      <div className="border-b border-stone-100 px-5 py-3 text-sm font-semibold text-stone-700">
        {isLoading ? <Skeleton className="my-0.5 h-4 w-20" /> : plural(documents.length, 'arquivo')}
      </div>
      {isLoading && <DocumentRowsSkeleton />}
      {(replace.error || remove.error) && <p className="bg-rose-50 px-5 py-2 text-sm text-rose-700">{(replace.error ?? remove.error)?.message}</p>}
      <ul className="divide-y divide-stone-100">
        {!isLoading && documents.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-stone-500">
            Nenhum arquivo nesta pasta ainda.
            {canDrop && (
              <span className="mt-3 flex flex-col items-center gap-2 text-stone-400">
                <Icon name="upload" className="size-6" />
                Arraste arquivos para cá para enviar.
              </span>
            )}
          </li>
        )}
        {documents.map((doc) => (
          <li key={doc.id} id={`documento-${doc.id}`} className={`flex items-center gap-4 px-5 py-3 ${highlight === doc.id ? 'bg-amber-50' : ''}`}>
            <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded-md bg-sky-50 text-[11px] font-bold text-sky-700 ring-1 ring-sky-200">{extension(doc.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-stone-800">
                {doc.name}
                {doc.version > 1 && <span className="ml-1.5 rounded bg-stone-100 px-1.5 py-0.5 text-xs font-normal text-stone-600">v{doc.version}</span>}
              </p>
              <p className="text-xs text-stone-500">
                {fileSize(doc.size)} · {doc.uploader?.name ?? 'Alguém'} · <RelativeTime date={doc.updated_at} />
              </p>
            </div>
            <div className="flex items-center gap-1">
              {isPreviewable(doc.mime_type) && (
                <button onClick={() => open(doc, false)} className={ICON_BUTTON} title="Abrir"><Icon name="eye" className="size-4" /></button>
              )}
              <button onClick={() => open(doc, true)} className={ICON_BUTTON} title="Baixar"><Icon name="download" className="size-4" /></button>
              {isAdmin && (
                <>
                  <label className={`${ICON_BUTTON} cursor-pointer`} title="Enviar nova versão">
                    <Icon name="refresh" className="size-4" />
                    <input type="file" className="hidden" onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) replace.mutate({ document: doc, file })
                      event.target.value = ''
                    }} />
                  </label>
                  <button onClick={() => confirm(`Mover ${doc.name} para a lixeira? Dá para restaurar por 30 dias.`) && remove.mutate(doc)} className="rounded-md p-2 text-stone-500 hover:bg-rose-50 hover:text-rose-600" title="Mover para a lixeira">
                    <Icon name="trash" className="size-4" />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
