// Todo o acesso a dados do mural. As telas usam só estes hooks; as regras de
// quem pode o quê ficam no banco (RLS), então aqui não há checagem de papel.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BUCKET, supabase } from './supabase'
import type { Activity, Comment, Document, Folder, FolderSummary } from './types'

const FOLDER_SUMMARY = '*, documents(count), comments(count), children:folders!parent_id(count)'

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}

export type FeedFilter = 'tudo' | 'arquivos' | 'comentarios'

const FEED_TYPES: Record<Exclude<FeedFilter, 'tudo'>, Activity['type'][]> = {
  arquivos: ['folder.created', 'folder.deleted', 'document.uploaded', 'document.replaced', 'document.deleted'],
  comentarios: ['comment.posted'],
}

// Leitura -------------------------------------------------------------------

export function useFolders(parentId: number | null) {
  return useQuery({
    queryKey: ['folders', parentId],
    queryFn: async () => {
      const query = supabase.from('folders').select(FOLDER_SUMMARY).order('name')
      return unwrap<FolderSummary[]>(await (parentId === null ? query.is('parent_id', null) : query.eq('parent_id', parentId)))
    },
  })
}

/** A pasta e o caminho até ela (para o breadcrumb). */
export function useFolderPath(id: number) {
  return useQuery({
    queryKey: ['folder', id],
    queryFn: async () => {
      const path: Folder[] = []
      let current: number | null = id
      while (current !== null) {
        const folder: Folder | null = unwrap(await supabase.from('folders').select('*').eq('id', current).maybeSingle())
        if (!folder) break
        path.unshift(folder)
        current = folder.parent_id
      }
      return path
    },
  })
}

export function useDocuments(folderId: number) {
  return useQuery({
    queryKey: ['documents', folderId],
    queryFn: async () =>
      unwrap<Document[]>(
        await supabase
          .from('documents')
          .select('*, uploader:profiles!uploaded_by(id, name)')
          .eq('folder_id', folderId)
          .order('updated_at', { ascending: false }),
      ),
  })
}

export function useLatestDocuments(limit = 5) {
  return useQuery({
    queryKey: ['documents', 'latest', limit],
    queryFn: async () =>
      unwrap<Document[]>(
        await supabase.from('documents').select('*, folder:folders(id, name)').order('updated_at', { ascending: false }).limit(limit),
      ),
  })
}

export function useComments(folderId: number) {
  return useQuery({
    queryKey: ['comments', folderId],
    queryFn: async () =>
      unwrap<Comment[]>(
        await supabase.from('comments').select('*, author:profiles(id, name)').eq('folder_id', folderId).order('created_at'),
      ),
  })
}

export function useFeed(filter: FeedFilter, limit: number) {
  return useQuery({
    queryKey: ['feed', filter, limit],
    queryFn: async () => {
      let query = supabase
        .from('activities')
        .select('*, user:profiles(id, name)')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit)
      if (filter !== 'tudo') query = query.in('type', FEED_TYPES[filter])
      return unwrap<Activity[]>(await query)
    },
  })
}

/** Quantos itens de outras pessoas chegaram desde a última visita a Novidades. */
export function useUnreadCount(userId: string, seenAt: string | null) {
  return useQuery({
    queryKey: ['feed', 'unread', userId, seenAt],
    queryFn: async () => {
      let query = supabase.from('activities').select('id', { count: 'exact', head: true }).neq('user_id', userId)
      if (seenAt) query = query.gt('created_at', seenAt)
      const { count, error } = await query
      if (error) throw new Error(error.message)
      return count ?? 0
    },
  })
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const count = async (table: string) => {
        const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true })
        if (error) throw new Error(error.message)
        return count ?? 0
      }
      const [pastas, arquivos, comentarios] = await Promise.all([count('folders'), count('documents'), count('comments')])
      return { Pastas: pastas, Arquivos: arquivos, Comentários: comentarios }
    },
  })
}

// Arquivos ------------------------------------------------------------------

/** Link temporário (1 min) para baixar ou abrir um arquivo do bucket privado. */
export async function fileUrl(document: Document, download: boolean): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(document.path, 60, download ? { download: document.name } : undefined)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

async function uploadFile(folderId: number, file: File): Promise<string> {
  const safeName = file.name.normalize('NFD').replace(/[^\w.-]+/g, '-')
  const path = `documentos/${folderId}/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined })
  if (error) throw new Error(error.message)
  return path
}

// Escrita -------------------------------------------------------------------

/** Depois de qualquer mudança, recarrega tudo: são poucas consultas e o feed muda junto. */
function useMuralMutation<T>(fn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: fn, onSettled: () => queryClient.invalidateQueries() })
}

export function useCreateFolder() {
  return useMuralMutation(async (input: { parentId: number | null; name: string; description: string }) => {
    unwrap(
      await supabase.from('folders').insert({
        parent_id: input.parentId,
        name: input.name.trim(),
        description: input.description.trim() || null,
      }),
    )
  })
}

export function useUpdateFolder() {
  return useMuralMutation(async (input: { id: number; name: string; description: string }) => {
    unwrap(
      await supabase
        .from('folders')
        .update({ name: input.name.trim(), description: input.description.trim() || null })
        .eq('id', input.id),
    )
  })
}

export function useDeleteFolder() {
  return useMuralMutation(async (id: number) => {
    // O banco apaga subpastas e documentos em cascata; os arquivos do bucket, não.
    const paths = unwrap<string[]>(await supabase.rpc('folder_document_paths', { p_folder_id: id }))
    unwrap(await supabase.from('folders').delete().eq('id', id))
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
  })
}

export function useUploadDocuments() {
  return useMuralMutation(async (input: { folderId: number; files: File[] }) => {
    for (const file of input.files) {
      const path = await uploadFile(input.folderId, file)
      const { error } = await supabase
        .from('documents')
        .insert({ folder_id: input.folderId, name: file.name, path, mime_type: file.type || null, size: file.size })
      if (error) {
        await supabase.storage.from(BUCKET).remove([path])
        throw new Error(error.message)
      }
    }
  })
}

export function useReplaceDocument() {
  return useMuralMutation(async (input: { document: Document; file: File }) => {
    const { document, file } = input
    const path = await uploadFile(document.folder_id, file)
    const { error } = await supabase
      .from('documents')
      .update({ path, mime_type: file.type || null, size: file.size, version: document.version + 1 })
      .eq('id', document.id)
    if (error) {
      await supabase.storage.from(BUCKET).remove([path])
      throw new Error(error.message)
    }
    await supabase.storage.from(BUCKET).remove([document.path])
  })
}

export function useDeleteDocument() {
  return useMuralMutation(async (document: Document) => {
    unwrap(await supabase.from('documents').delete().eq('id', document.id))
    await supabase.storage.from(BUCKET).remove([document.path])
  })
}

export function usePostComment() {
  return useMuralMutation(async (input: { folderId: number; body: string }) => {
    unwrap(await supabase.from('comments').insert({ folder_id: input.folderId, body: input.body.trim() }))
  })
}

export function useDeleteComment() {
  return useMuralMutation(async (id: number) => {
    unwrap(await supabase.from('comments').delete().eq('id', id))
  })
}

export async function markFeedAsSeen(userId: string) {
  unwrap(await supabase.from('profiles').update({ feed_seen_at: new Date().toISOString() }).eq('id', userId))
}
