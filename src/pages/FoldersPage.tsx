import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Comments } from '../components/Comments'
import { DocumentList } from '../components/DocumentList'
import { FolderCard } from '../components/FolderCard'
import { Icon } from '../components/Icon'
import { NewFolderButton } from '../components/NewFolderDialog'
import { useDeleteFolder, useFolderPath, useFolders, useUpdateFolder, useUploadDocuments } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Folder } from '../lib/types'

/** Gerenciador de arquivos. Sem id = raiz (só os temas); com id = conteúdo e conversa da pasta. */
export function FoldersPage() {
  const params = useParams()
  const folderId = params.id ? Number(params.id) : null
  const { data: path = [], isLoading } = useFolderPath(folderId ?? 0)
  const folder = folderId ? path[path.length - 1] ?? null : null

  if (folderId && !isLoading && !folder) {
    return <p className="rounded-xl bg-white p-10 text-center text-stone-500 ring-1 ring-stone-200">Pasta não encontrada. Ela pode ter sido apagada.</p>
  }
  if (folderId && !folder) return null

  return <FolderView key={folderId ?? 'raiz'} folder={folder} path={folderId ? path : []} />
}

function FolderView({ folder, path }: { folder: Folder | null; path: Folder[] }) {
  const { isAdmin } = useAuth()
  const [search] = useSearchParams()
  const { data: children = [] } = useFolders(folder?.id ?? null)
  const upload = useUploadDocuments()
  const highlight = search.get('documento') ? Number(search.get('documento')) : null

  useEffect(() => {
    if (search.has('comentarios')) document.getElementById('comentarios')?.scrollIntoView()
  }, [search])

  return (
    <div>
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-stone-500">
        <Link to="/arquivos" className="hover:text-emerald-800">Arquivos</Link>
        {path.map((crumb, index) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <Icon name="chevron-right" className="size-4" />
            {index === path.length - 1 ? (
              <span className="font-medium text-stone-800">{crumb.name}</span>
            ) : (
              <Link to={`/arquivos/${crumb.id}`} className="hover:text-emerald-800">{crumb.name}</Link>
            )}
          </span>
        ))}
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        {folder ? (
          <FolderHeader folder={folder} />
        ) : (
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Arquivos</h1>
            <p className="mt-1 text-stone-600">Cada pasta é um tema, com seus arquivos e sua própria conversa.</p>
          </div>
        )}

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <NewFolderButton parent={folder} />
            {folder && (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800">
                <Icon name="upload" className="size-4" />
                {upload.isPending ? 'Enviando...' : 'Enviar arquivos'}
                <input type="file" multiple className="hidden" disabled={upload.isPending} onChange={(event) => {
                  const files = [...(event.target.files ?? [])]
                  if (files.length) upload.mutate({ folderId: folder.id, files })
                  event.target.value = ''
                }} />
              </label>
            )}
            {folder && <FolderAdminActions folder={folder} />}
          </div>
        )}
      </div>

      {upload.error && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">Falha no envio: {upload.error.message}</p>}

      <div className={`grid gap-8 ${folder ? 'lg:grid-cols-5' : ''}`}>
        <div className={`space-y-6 ${folder ? 'lg:col-span-3' : ''}`}>
          {children.length > 0 && (
            <div className={`grid gap-3 ${folder ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
              {children.map((child) => <FolderCard key={child.id} folder={child} />)}
            </div>
          )}
          {!folder && children.length === 0 && (
            <p className="rounded-xl bg-white p-10 text-center text-sm text-stone-500 ring-1 ring-stone-200">Nenhuma pasta criada ainda.</p>
          )}
          {folder && <DocumentList folderId={folder.id} highlight={highlight} />}
        </div>

        {/* Uma seção de comentários por tema */}
        {folder && (
          <div className="lg:col-span-2">
            <Comments folder={folder} />
          </div>
        )}
      </div>
    </div>
  )
}

function FolderHeader({ folder }: { folder: Folder }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(folder.name)
  const [description, setDescription] = useState(folder.description ?? '')
  const update = useUpdateFolder()

  if (!editing) {
    return (
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-stone-900">{folder.name}</h1>
        {folder.description && <p className="mt-1 max-w-2xl text-stone-600">{folder.description}</p>}
        <EditTrigger onEdit={() => setEditing(true)} />
      </div>
    )
  }

  return (
    <form className="w-full max-w-xl space-y-2" onSubmit={(event) => {
      event.preventDefault()
      update.mutate({ id: folder.id, name, description }, { onSuccess: () => setEditing(false) })
    }}>
      <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-lg font-semibold focus:border-emerald-600 focus:outline-none" />
      <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} maxLength={500} placeholder="Descrição (opcional)" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none" />
      <div className="flex gap-2">
        <button className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white">Salvar</button>
        <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200">Cancelar</button>
      </div>
    </form>
  )
}

function EditTrigger({ onEdit }: { onEdit: () => void }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return null
  return (
    <button onClick={onEdit} className="mt-2 flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-emerald-800">
      <Icon name="pencil" className="size-3.5" /> Editar nome e descrição
    </button>
  )
}

function FolderAdminActions({ folder }: { folder: Folder }) {
  const navigate = useNavigate()
  const remove = useDeleteFolder()

  return (
    <button
      onClick={() => {
        if (!confirm(`Apagar a pasta ${folder.name} com todas as subpastas, arquivos e comentários?`)) return
        // Sai da pasta antes: ela deixa de existir e esta tela sairia de cena no meio da exclusão.
        navigate(folder.parent_id ? `/arquivos/${folder.parent_id}` : '/arquivos')
        remove.mutateAsync(folder.id).catch((error: Error) => alert(`Não foi possível apagar a pasta: ${error.message}`))
      }}
      className="rounded-lg p-2 text-stone-500 hover:bg-rose-50 hover:text-rose-600"
      title="Apagar pasta"
    >
      <Icon name="trash" className="size-4" />
    </button>
  )
}
