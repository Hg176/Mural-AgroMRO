export type Role = 'admin' | 'socio'

export interface Profile {
  id: string
  name: string
  role: Role
  feed_seen_at: string | null
}

export interface Folder {
  id: number
  parent_id: number | null
  name: string
  description: string | null
  created_by: string | null
  created_at: string
}

/** Pasta com os totais usados nos cartões. */
export interface FolderSummary extends Folder {
  documents: { count: number }[]
  comments: { count: number }[]
  children: { count: number }[]
}

export interface Document {
  id: number
  folder_id: number
  uploaded_by: string | null
  name: string
  path: string
  mime_type: string | null
  size: number
  version: number
  updated_at: string
  uploader?: Pick<Profile, 'id' | 'name'> | null
  folder?: Pick<Folder, 'id' | 'name'> | null
}

export interface Comment {
  id: number
  folder_id: number
  user_id: string
  body: string
  created_at: string
  author: Pick<Profile, 'id' | 'name'> | null
}

export type ActivityType =
  | 'folder.created'
  | 'folder.deleted'
  | 'document.uploaded'
  | 'document.replaced'
  | 'document.deleted'
  | 'comment.posted'

export interface Activity {
  id: number
  type: ActivityType
  user_id: string | null
  folder_id: number | null
  subject_id: number | null
  properties: { name?: string; folder?: string; version?: number; excerpt?: string }
  created_at: string
  user: Pick<Profile, 'id' | 'name'> | null
}
