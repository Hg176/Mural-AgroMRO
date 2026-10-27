import { useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { SITE_URL, supabase } from '../lib/supabase'

/**
 * Entrar sem senha: a pessoa digita o e-mail e clica no link que chega. A
 * mensagem é a mesma para e-mail conhecido ou não, para ninguém descobrir pelo
 * site quem tem acesso.
 */
export function Login() {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: SITE_URL },
    })
    setLoading(false)
    // Sem conta, o Supabase recusa ("signups not allowed"); fica igual ao sucesso de propósito.
    if (error && error.code !== 'otp_disabled' && error.code !== 'signup_disabled') {
      setError(error.code === 'over_email_send_rate_limit' ? 'Muitos links pedidos em pouco tempo. Espere alguns minutos e tente de novo.' : `Não foi possível enviar o link: ${error.message}`)
      return
    }
    setSentTo(email.trim())
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

        {sentTo ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-xl" role="status">
            <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Icon name="mail" className="size-6" />
            </span>
            <h2 className="font-semibold text-stone-900">Confira seu e-mail</h2>
            <p className="mt-2 text-sm text-stone-600">
              Se <strong>{sentTo}</strong> tiver acesso ao mural, o link para entrar chega em instantes. Pode abrir pelo celular ou pelo computador.
            </p>
            <p className="mt-2 text-xs text-stone-500">Não chegou? Veja a caixa de spam. Se pedir de novo, use o e-mail mais recente.</p>
            <button onClick={() => setSentTo(null)} className="mt-4 rounded-lg px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">
              Usar outro e-mail
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-700">E-mail</label>
              <input id="email" type="email" required autoFocus autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none" />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button disabled={loading} className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
              {loading ? 'Enviando...' : 'Receber link de acesso'}
            </button>
            <p className="text-center text-xs text-stone-500">Sem senha: enviamos um link para o seu e-mail.</p>
          </form>
        )}
      </div>
    </div>
  )
}
