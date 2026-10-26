// Cor estável por pessoa, para o Sander e o Zé se reconhecerem no feed.
const PALETTE = ['bg-emerald-600', 'bg-amber-600', 'bg-sky-600', 'bg-rose-600', 'bg-violet-600']

function colorFor(id: string): string {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function Avatar({ user, className = 'size-9' }: { user: { id: string; name: string } | null; className?: string }) {
  return (
    <span
      title={user?.name ?? 'Usuário removido'}
      className={`${className} ${user ? colorFor(user.id) : 'bg-stone-400'} inline-flex shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white`}
    >
      {user ? initials(user.name) : '?'}
    </span>
  )
}
