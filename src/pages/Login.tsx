import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { SITE_URL, supabase } from '../lib/supabase'

const CODE_LENGTH = 6
const RESEND_SECONDS = 60

/**
 * Entrar sem senha, em dois passos que deslizam: o e-mail e depois o código
 * que chega nele (o e-mail também traz um link, para quem abre no mesmo
 * aparelho). A resposta é a mesma para e-mail com ou sem acesso, para ninguém
 * descobrir pelo site quem está no mural.
 */
export function Login() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'codigo'>('email')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn(resendIn - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  async function sendCode() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: SITE_URL },
    })
    setLoading(false)
    // Sem conta, o Supabase recusa ("signups not allowed"); fica igual ao sucesso de propósito.
    if (error && error.code !== 'otp_disabled' && error.code !== 'signup_disabled') {
      setError(error.code === 'over_email_send_rate_limit' ? 'Muitos códigos pedidos em pouco tempo. Espere um minuto e tente de novo.' : `Não foi possível enviar o código: ${error.message}`)
      return false
    }
    setResendIn(RESEND_SECONDS)
    return true
  }

  async function submitEmail(event: FormEvent) {
    event.preventDefault()
    if (await sendCode()) setStep('codigo')
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-6 pt-[18vh] pb-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
            <Icon name="leaf" className="size-5" />
          </span>
          <span className="font-semibold text-stone-900">Mural AgroMRO</span>
        </div>

        {/* Os dois passos lado a lado; o trilho desliza para mostrar o segundo. */}
        <div className="overflow-hidden">
          <div className={`flex w-[200%] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${step === 'codigo' ? '-translate-x-1/2' : ''}`}>
            <section className="w-1/2 px-px" inert={step !== 'email'} aria-hidden={step !== 'email'}>
              <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Entrar</h1>
              <p className="mt-1.5 text-sm text-stone-500">Digite seu e-mail e enviaremos um código de acesso.</p>

              <form onSubmit={submitEmail} className="mt-8 space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-700">E-mail</label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="voce@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-11 w-full rounded-lg border border-stone-300 px-3.5 text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 focus:outline-none"
                  />
                </div>
                {step === 'email' && error && <p className="text-sm text-rose-600">{error}</p>}
                <button disabled={loading} className="h-11 w-full rounded-lg bg-stone-900 font-medium text-white transition hover:bg-stone-800 disabled:opacity-60">
                  {loading ? 'Enviando...' : 'Continuar'}
                </button>
              </form>
            </section>

            <section className="w-1/2 px-px" inert={step !== 'codigo'} aria-hidden={step !== 'codigo'}>
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setError(null)
                }}
                className="-ml-1 mb-4 flex items-center gap-1 rounded-md px-1 py-0.5 text-sm text-stone-500 hover:text-stone-900"
              >
                <Icon name="chevron-right" className="size-4 rotate-180" /> Voltar
              </button>
              <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Digite o código</h1>
              <p className="mt-1.5 text-sm text-stone-500">
                Se <span className="font-medium text-stone-700">{email.trim()}</span> tiver acesso ao mural, o código de {CODE_LENGTH} números chega em instantes.
              </p>

              {step === 'codigo' && <CodeForm email={email.trim()} />}

              <p className="mt-6 text-center text-sm text-stone-500">
                Não chegou? Veja o spam ou{' '}
                {resendIn > 0 ? (
                  <span className="text-stone-400">reenvie em {resendIn}s</span>
                ) : (
                  <button type="button" onClick={sendCode} disabled={loading} className="font-medium text-emerald-700 hover:underline">
                    reenviar código
                  </button>
                )}
              </p>
              {step === 'codigo' && error && <p className="mt-2 text-center text-sm text-rose-600">{error}</p>}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

/** O código do e-mail entra o aparelho onde ele é digitado, não o que abriu o e-mail. */
function CodeForm({ email }: { email: string }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  // Espera o deslize terminar para pôr o cursor no código (focar antes faz a tela pular).
  useEffect(() => {
    const timer = setTimeout(() => input.current?.focus({ preventScroll: true }), 500)
    return () => clearTimeout(timer)
  }, [])

  async function verify(token: string) {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (error) {
      setError(error.code === 'otp_expired' ? 'Código incorreto ou vencido. Confira o e-mail mais recente.' : `Não foi possível entrar: ${error.message}`)
      setCode('')
      setLoading(false)
      input.current?.focus()
    }
    // Deu certo: o AuthProvider recebe a sessão e o mural abre sozinho.
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (code.length === CODE_LENGTH) verify(code)
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      {/* Um campo de verdade (colar, preencher pelo celular, leitor de tela) por baixo das caixinhas. */}
      <label htmlFor="codigo" className="sr-only">Código de {CODE_LENGTH} números</label>
      <div className="group relative" onClick={() => input.current?.focus()}>
        <input
          ref={input}
          id="codigo"
          value={code}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH)
            setCode(digits)
            setError(null)
            if (digits.length === CODE_LENGTH) verify(digits)
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          disabled={loading}
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
        />
        <div className="grid grid-cols-6 gap-2" aria-hidden="true">
          {Array.from({ length: CODE_LENGTH }, (_, index) => {
            const active = index === Math.min(code.length, CODE_LENGTH - 1)
            return (
              <span
                key={index}
                className={`flex h-12 items-center justify-center rounded-lg border text-xl font-semibold text-stone-900 transition ${
                  error ? 'border-rose-300' : active ? 'border-stone-300 group-focus-within:border-emerald-600 group-focus-within:ring-4 group-focus-within:ring-emerald-600/10' : 'border-stone-300'
                }`}
              >
                {code[index] ?? ''}
              </span>
            )
          })}
        </div>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button disabled={loading || code.length !== CODE_LENGTH} className="h-11 w-full rounded-lg bg-stone-900 font-medium text-white transition hover:bg-stone-800 disabled:opacity-40">
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
