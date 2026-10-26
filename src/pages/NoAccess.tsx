import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

/** Conta existe no Supabase (talvez de outro projeto), mas não foi liberada no mural. */
export function NoAccess() {
  const { session } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
      <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-stone-200">
        <h1 className="text-lg font-semibold text-stone-900">Acesso ainda não liberado</h1>
        <p className="mt-2 text-sm text-stone-600">
          A conta <strong>{session?.user.email}</strong> existe, mas ainda não faz parte do mural. Peça ao Hugo para liberar o seu acesso.
        </p>
        <button onClick={() => supabase.auth.signOut()} className="mt-4 rounded-lg px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">
          Sair
        </button>
      </div>
    </div>
  )
}
