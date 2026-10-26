import { useEffect, useState } from 'react'
import { Feed } from '../components/Feed'
import { markFeedAsSeen } from '../lib/api'
import { useAuth, useProfile } from '../lib/auth'

export function FeedPage() {
  const profile = useProfile()
  const { refreshProfile } = useAuth()
  // Guarda a última visita antes de marcar como visto, para os itens novos continuarem destacados.
  const [seenAt] = useState(profile.feed_seen_at)

  useEffect(() => {
    markFeedAsSeen(profile.id).then(refreshProfile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">Novidades</h1>
        <p className="text-sm text-stone-500">Tudo o que mudou no projeto, do mais recente para o mais antigo.</p>
      </div>
      <Feed seenAt={seenAt} />
    </div>
  )
}
