import { useRef, useState, type FormEvent } from 'react'
import { useCreateFolder } from '../lib/api'
import { Icon } from './Icon'

export function NewFolderButton({ parent }: { parent: { id: number; name: string } | null }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const create = useCreateFolder()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    create.mutate(
      { parentId: parent?.id ?? null, name, description },
      {
        onSuccess: () => {
          setName('')
          setDescription('')
          dialog.current?.close()
        },
      },
    )
  }

  return (
    <>
      <button onClick={() => dialog.current?.showModal()} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm ring-1 ring-stone-300 hover:bg-stone-50">
        <Icon name="folder-plus" className="size-4" /> Nova pasta
      </button>

      <dialog ref={dialog} className="m-auto w-full max-w-md rounded-2xl p-0 shadow-2xl backdrop:bg-stone-900/40">
        <form onSubmit={submit} className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-stone-900">Nova pasta{parent ? ` em ${parent.name}` : ''}</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Nome</label>
            <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} placeholder="Ex.: Estudos"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-emerald-600 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Descrição <span className="font-normal text-stone-400">(opcional)</span></label>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={500}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none" />
          </div>
          {create.error && <p className="text-sm text-rose-600">{create.error.message}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => dialog.current?.close()} className="rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-100">Cancelar</button>
            <button disabled={create.isPending} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">Criar pasta</button>
          </div>
        </form>
      </dialog>
    </>
  )
}
