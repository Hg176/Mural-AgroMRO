import { useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { supabase } from '../lib/supabase'

// Só "credenciais inválidas" é culpa de quem digitou; o resto é configuração
// (chave errada, conta não confirmada, sem rede) e precisa aparecer como é.
function loginErrorMessage(error: { code?: string; message: string; status?: number }) {
  if (error.code === 'invalid_credentials') return 'E-mail ou senha incorretos.'
  if (error.code === 'email_not_confirmed') return 'Esta conta ainda não foi confirmada no Supabase (marque "Auto Confirm User" ao criar).'
  if (error.status === 401 || /api key/i.test(error.message)) return 'Chave do Supabase inválida. Confira a variável SUPABASE_PUBLISHABLE_KEY no GitHub.'
  if (!error.status) return 'Não foi possível falar com o Supabase. Confira a variável SUPABASE_URL no GitHub e a sua conexão.'
  return `Não foi possível entrar: ${error.message}`
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(loginErrorMessage(error))
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-stone-800 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <span className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Icon name="leaf" className="size-8" />
          </span>
          <h1 className="text-2xl font-semibold">Mural AgroMRO</h1>
          <p className="mt-1 text-sm text-emerald-100/80">Acompanhe os estudos e o desenvolvimento do projeto.</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-xl">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-700">E-mail</label>
            <input id="email" type="email" required autoFocus autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-stone-700">Senha</label>
            <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none" />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button disabled={loading} className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
