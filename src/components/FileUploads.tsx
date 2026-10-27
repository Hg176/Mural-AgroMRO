import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { MAX_FILE_SIZE, uploadDocument } from '../lib/api'
import { extension, fileSize } from '../lib/format'
import { Icon } from './Icon'

interface Upload {
  id: string
  name: string
  size: number
  progress: number
  status: 'enviando' | 'pronto' | 'erro'
  error?: string
}

/** Um arquivo que nem chega a ser enviado (pasta, vazio, grande demais). */
interface Rejected {
  name: string
  size: number
  error: string
}

/**
 * Fila de envios de uma pasta: cada arquivo sobe por conta própria, com seu
 * progresso e seu erro, e um que falha não atrapalha os outros.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useFolderUploads(folderId: number) {
  const [uploads, setUploads] = useState<Upload[]>([])
  const queryClient = useQueryClient()

  function patch(id: string, change: Partial<Upload>) {
    setUploads((list) => list.map((upload) => (upload.id === id ? { ...upload, ...change } : upload)))
  }

  function dismiss(id: string) {
    setUploads((list) => list.filter((upload) => upload.id !== id))
  }

  function add(files: File[], rejected: Rejected[] = []) {
    const added: Upload[] = rejected.map((item) => ({ id: crypto.randomUUID(), ...item, progress: 0, status: 'erro' }))

    for (const file of files) {
      const id = crypto.randomUUID()
      const problem = file.size > MAX_FILE_SIZE ? `Maior que o limite de ${fileSize(MAX_FILE_SIZE)}.` : file.size === 0 ? 'Arquivo vazio.' : null
      added.push({ id, name: file.name, size: file.size, progress: 0, status: problem ? 'erro' : 'enviando', error: problem ?? undefined })
      if (problem) continue

      uploadDocument(folderId, file, (progress) => patch(id, { progress }))
        .then(() => {
          patch(id, { status: 'pronto', progress: 1 })
          queryClient.invalidateQueries()
          // Some da lista depois de um tempo; o arquivo já aparece na pasta.
          setTimeout(() => dismiss(id), 4000)
        })
        .catch((error: Error) => patch(id, { status: 'erro', error: error.message }))
    }

    setUploads((list) => [...list, ...added])
  }

  return { uploads, add, dismiss, sending: uploads.some((upload) => upload.status === 'enviando') }
}

/**
 * Deixa soltar arquivos em qualquer lugar da pasta. Enquanto algo é arrastado
 * por cima, a pasta inteira ganha destaque para mostrar onde o arquivo vai.
 */
export function FileDropZone({ folderName, onFiles, children }: { folderName: string; onFiles: (files: File[], rejected: Rejected[]) => void; children: ReactNode }) {
  const [active, setActive] = useState(false)
  // dragenter/dragleave disparam a cada filho atravessado; o contador evita o destaque piscar.
  const depth = useRef(0)

  // Soltar fora da área faria o navegador abrir o arquivo e sair do mural.
  useEffect(() => {
    const block = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault()
    }
    window.addEventListener('dragover', block)
    window.addEventListener('drop', block)
    return () => {
      window.removeEventListener('dragover', block)
      window.removeEventListener('drop', block)
    }
  }, [])

  const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files')

  function drop(event: DragEvent) {
    if (!hasFiles(event)) return
    event.preventDefault()
    depth.current = 0
    setActive(false)

    const files: File[] = []
    const rejected: Rejected[] = []
    for (const item of event.dataTransfer.items) {
      if (item.kind !== 'file') continue
      const file = item.getAsFile()
      if (item.webkitGetAsEntry?.()?.isDirectory) {
        rejected.push({ name: file?.name ?? 'Pasta', size: 0, error: 'Pastas não são enviadas. Abra a pasta no computador e arraste os arquivos de dentro.' })
      } else if (file) {
        files.push(file)
      }
    }
    if (files.length || rejected.length) onFiles(files, rejected)
  }

  return (
    <div
      className="relative"
      onDragEnter={(event) => {
        if (!hasFiles(event)) return
        depth.current += 1
        setActive(true)
      }}
      onDragOver={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={(event) => {
        if (!hasFiles(event)) return
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setActive(false)
      }}
      onDrop={drop}
    >
      {children}
      {active && (
        <div aria-hidden="true" className="pointer-events-none absolute -inset-3 z-20 flex items-start justify-center rounded-2xl border-2 border-dashed border-emerald-500 bg-emerald-50/85 backdrop-blur-[1px]">
          <div className="sticky top-[40vh] mt-24 flex flex-col items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg">
              <Icon name="upload" className="size-7" />
            </span>
            <p className="text-lg font-semibold text-emerald-900">Solte para enviar</p>
            <p className="text-sm text-emerald-800">Os arquivos vão para a pasta <span className="font-medium">{folderName}</span></p>
          </div>
        </div>
      )}
    </div>
  )
}

/** A lista de envios em andamento, com a barra de cada arquivo e o erro de quem falhou. */
export function UploadList({ uploads, onDismiss }: { uploads: Upload[]; onDismiss: (id: string) => void }) {
  const sending = uploads.filter((upload) => upload.status === 'enviando').length

  return (
    <section aria-live="polite" className={uploads.length ? 'mb-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200' : 'sr-only'}>
      {uploads.length > 0 && (
        <>
          <h2 className="border-b border-stone-100 px-5 py-3 text-sm font-semibold text-stone-700">
            {sending ? `Enviando ${sending} de ${uploads.length} ${uploads.length === 1 ? 'arquivo' : 'arquivos'}...` : 'Envios'}
          </h2>
          <ul className="divide-y divide-stone-100">
            {uploads.map((upload) => (
              <li key={upload.id} className="flex items-center gap-4 px-5 py-3">
                <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded-md bg-stone-50 text-[11px] font-bold text-stone-600 ring-1 ring-stone-200">{extension(upload.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-900">{upload.name}</p>
                  {upload.status === 'enviando' && (
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-label={`Enviando ${upload.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(upload.progress * 100)}>
                        <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-200" style={{ width: `${Math.max(2, upload.progress * 100)}%` }} />
                      </div>
                      <span className="w-9 text-right text-xs text-stone-500 tabular-nums">{Math.round(upload.progress * 100)}%</span>
                    </div>
                  )}
                  {upload.status === 'pronto' && <p className="mt-0.5 text-xs text-emerald-700">Enviado · {fileSize(upload.size)}</p>}
                  {upload.status === 'erro' && <p className="mt-0.5 text-xs text-rose-600">Não enviado: {upload.error}</p>}
                </div>
                {upload.status === 'pronto' && <Icon name="check" className="size-5 text-emerald-600" />}
                {upload.status === 'erro' && (
                  <button onClick={() => onDismiss(upload.id)} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label={`Fechar aviso de ${upload.name}`}>
                    <Icon name="x" className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
