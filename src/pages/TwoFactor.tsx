import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { Skeleton } from '../components/Skeleton'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

interface Enrollment {
  factorId: string
  qrCode: string
  secret: string
}

/**
 * Login em 2 etapas, obrigatório para todos. Na primeira vez a pessoa liga o
 * app autenticador lendo o QR code; nas próximas, só digita o código.
 */
export function TwoFactor({ step }: { step: 'cadastrar' | 'confirmar' }) {
  return step === 'cadastrar' ? <Enroll /> : <Verify />
}

function Enroll() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    // O StrictMode roda o efeito duas vezes; um cadastro pela metade basta.
    if (started.current) return
    started.current = true

    async function start() {
      // Tentativas anteriores que não chegaram ao código ficam pendentes: limpa antes.
      const { data: factors } = await supabase.auth.mfa.listFactors()
      for (const factor of factors?.all ?? []) {
        if (factor.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: factor.id })
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Mural AgroMRO' })
      if (error) return setError(`Não foi possível começar: ${error.message}`)
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
    }
    start()
  }, [])

  return (
    <Card title="Proteja sua conta" subtitle="O mural agora pede um código do celular a cada login, além da senha.">
      <ol className="space-y-4 text-sm text-stone-700">
        <li>
          <strong>1.</strong> Instale um app autenticador no celular: <em>Google Authenticator</em>, <em>Microsoft Authenticator</em> ou <em>Authy</em>.
        </li>
        <li>
          <strong>2.</strong> No app, toque em <em>adicionar</em> e leia este QR code:
          <div className="mt-3 flex justify-center">
            {enrollment ? (
              <img src={enrollment.qrCode} alt="QR code para o app autenticador" className="size-44 rounded-lg ring-1 ring-stone-200" />
            ) : (
              <Skeleton className="size-44 rounded-lg" />
            )}
          </div>
          {enrollment && (
            <details className="mt-2 text-xs text-stone-500">
              <summary className="cursor-pointer">Não consegue ler? Digite a chave no app</summary>
              <code className="mt-1 block rounded bg-stone-100 px-2 py-1 font-mono break-all text-stone-700 select-all">{enrollment.secret}</code>
            </details>
          )}
        </li>
        <li>
          <strong>3.</strong> Digite o código de 6 números que aparece no app:
        </li>
      </ol>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      {enrollment && <CodeForm factorId={enrollment.factorId} button="Ativar e entrar" />}
    </Card>
  )
}

function Verify() {
  const [factorId, setFactorId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => setFactorId(data?.totp[0]?.id ?? null))
  }, [])

  return (
    <Card title="Digite o código" subtitle="Abra o app autenticador no celular e digite o código de 6 números do Mural AgroMRO.">
      {factorId ? <CodeForm factorId={factorId} button="Entrar" /> : <Skeleton className="mt-4 h-24" />}
      <p className="mt-4 text-xs text-stone-500">Perdeu o celular? Peça ao Hugo para liberar um novo cadastro do app.</p>
    </Card>
  )
}

function CodeForm({ factorId, button }: { factorId: string; button: string }) {
  const { refreshMfa } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) {
      setError(error.code === 'mfa_verification_failed' ? 'Código incorreto ou vencido. Confira o app e tente de novo.' : error.message)
      setCode('')
      setLoading(false)
      return
    }
    await refreshMfa()
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <label htmlFor="codigo" className="sr-only">Código de 6 números</label>
      <input
        id="codigo"
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        required
        pattern="\d{6}"
        placeholder="000000"
        className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-center font-mono text-2xl tracking-[0.5em] focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button disabled={loading || code.length !== 6} className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
        {loading ? 'Conferindo...' : button}
      </button>
    </form>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-stone-800 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <span className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Icon name="lock" className="size-8" />
          </span>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-emerald-100/80">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          {children}
          <button onClick={() => supabase.auth.signOut()} className="mt-3 w-full rounded-lg px-4 py-2 text-sm text-stone-500 hover:bg-stone-100">
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}
