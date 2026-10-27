import { useState, type FormEvent } from 'react'
import { useComments, useDeleteComment, usePostComment } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Folder } from '../lib/types'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { RelativeTime } from './RelativeTime'
import { CommentsSkeleton } from './Skeleton'

/** A seção de conversa de um tema (uma por pasta). */
export function Comments({ folder }: { folder: Folder }) {
  const { profile, isAdmin } = useAuth()
  const { data: comments = [], isLoading } = useComments(folder.id)
  const post = usePostComment()
  const remove = useDeleteComment()
  const [body, setBody] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!body.trim()) return
    post.mutate({ folderId: folder.id, body }, { onSuccess: () => setBody('') })
  }

  return (
    <section id="comentarios" className="rounded-xl bg-white shadow-sm ring-1 ring-stone-200">
      <header className="border-b border-stone-100 px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-stone-900">
          <Icon name="comment" className="size-4 text-violet-600" />
          Comentários sobre {folder.name}
        </h2>
        <p className="text-xs text-stone-500">Um espaço de conversa para este tema.</p>
      </header>

      <ul className="max-h-[32rem] space-y-4 overflow-y-auto px-5 py-4">
        {isLoading && <li><CommentsSkeleton /></li>}
        {!isLoading && comments.length === 0 && <li className="py-6 text-center text-sm text-stone-500">Ninguém comentou ainda. Comece a conversa.</li>}
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-3">
            <Avatar user={comment.author} className="size-8" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">{comment.author?.name ?? 'Alguém'}</span>
                <RelativeTime date={comment.created_at} className="text-xs text-stone-500" />
                {(isAdmin || comment.user_id === profile?.id) && (
                  <button
                    onClick={() => confirm('Apagar este comentário?') && remove.mutate(comment.id)}
                    className="ml-auto text-stone-400 hover:text-rose-600"
                    title="Apagar"
                  >
                    <Icon name="trash" className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm whitespace-pre-line text-stone-700">{comment.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="border-t border-stone-100 p-4">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          maxLength={5000}
          placeholder="Escreva um comentário..."
          className="w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
        />
        {post.error && <p className="mt-1 text-sm text-rose-600">Não foi possível comentar: {post.error.message}</p>}
        <div className="mt-2 flex justify-end">
          <button disabled={post.isPending || !body.trim()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50">
            {post.isPending ? 'Enviando...' : 'Comentar'}
          </button>
        </div>
      </form>
    </section>
  )
}
