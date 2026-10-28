import { useEffect, useRef, useState } from 'react'
import { fileText } from '../lib/api'
import type { Document } from '../lib/types'
import { Icon } from './Icon'

const VIEWER_URL = `${import.meta.env.BASE_URL}visualizar.html`

/**
 * Mostra uma página HTML do mural dentro de um iframe isolado (sandbox sem
 * allow-same-origin): os scripts da página rodam, mas sem acesso à conta de
 * quem está vendo. O conteúdo vai por postMessage para public/visualizar.html.
 */
export function HtmlViewer({ document, onClose, onDownload }: { document: Document; onClose: () => void; onDownload: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    dialog.current?.showModal()
    fileText(document).then(setHtml, (reason: Error) => setError(reason.message))
  }, [document])

  useEffect(() => {
    if (html === null) return
    function ready(event: MessageEvent) {
      if (event.source === frame.current?.contentWindow && event.data === 'visualizador-pronto') {
        frame.current?.contentWindow?.postMessage({ html }, '*')
      }
    }
    window.addEventListener('message', ready)
    return () => window.removeEventListener('message', ready)
  }, [html])

  return (
    <dialog ref={dialog} onClose={onClose} className="m-auto h-[92dvh] w-[96vw] max-w-6xl flex-col overflow-hidden rounded-2xl p-0 shadow-2xl open:flex backdrop:bg-stone-900/50">
      <header className="flex items-center gap-3 border-b border-stone-200 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-stone-800">{document.name}</p>
          <p className="text-xs text-stone-500">Página aberta em modo isolado: ela não tem acesso à sua conta do mural.</p>
        </div>
        <button onClick={onDownload} className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-emerald-800" title="Baixar"><Icon name="download" className="size-4" /></button>
        <button onClick={() => dialog.current?.close()} className="rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800" title="Fechar"><Icon name="x" className="size-4" /></button>
      </header>
      {error && <p className="bg-rose-50 px-5 py-2 text-sm text-rose-700">{error}</p>}
      {html === null && !error && <p className="px-5 py-10 text-center text-sm text-stone-500">Carregando página…</p>}
      {html !== null && (
        <iframe ref={frame} src={VIEWER_URL} title={document.name} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" className="min-h-0 w-full flex-1 bg-white" />
      )}
    </dialog>
  )
}
