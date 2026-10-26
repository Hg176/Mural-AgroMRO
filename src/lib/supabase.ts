import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (veja .env.example).')
}

// Todas as tabelas do mural ficam no schema "mural", separado de outros projetos.
export const supabase = createClient(url, key, { db: { schema: 'mural' } })

export const BUCKET = 'mural'
