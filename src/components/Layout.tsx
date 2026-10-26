import { NavLink, Outlet } from 'react-router-dom'
import { useUnreadCount } from '../lib/api'
import { useProfile } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { Avatar } from './Avatar'
import { Icon, type IconName } from './Icon'

const TABS: [string, string, IconName][] = [
  ['/', 'Início', 'home'],
  ['/novidades', 'Novidades', 'activity'],
  ['/arquivos', 'Arquivos', 'folder'],
]

// Barra do "site", no espírito do SharePoint: identidade + navegação por abas.
export function Layout() {
  const profile = useProfile()
  const { data: unread = 0 } = useUnreadCount(profile.id, profile.feed_seen_at)

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-5 sm:px-6">
          <NavLink to="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
              <Icon name="leaf" className="size-6" />
            </span>
            <span>
              <span className="block text-lg leading-tight font-semibold">Mural AgroMRO</span>
              <span className="block text-xs text-emerald-100/80">Estudos e desenvolvimento, para os sócios</span>
            </span>
          </NavLink>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium">{profile.name}</div>
              <div className="text-xs text-emerald-100/80">{profile.role === 'admin' ? 'Administrador' : 'Sócio'}</div>
            </div>
            <Avatar user={profile} className="size-9 ring-2 ring-white/40" />
            <button onClick={() => supabase.auth.signOut()} className="rounded-md p-2 text-emerald-100 hover:bg-white/10 hover:text-white" title="Sair">
              <Icon name="logout" />
            </button>
          </div>
        </div>

        <nav className="mx-auto mt-4 flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
          {TABS.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap transition ${isActive ? 'bg-stone-100 text-emerald-900' : 'text-emerald-50 hover:bg-white/10'}`
              }
            >
              <Icon name={icon} className="size-4" />
              {label}
              {to === '/novidades' && unread > 0 && <span className="rounded-full bg-amber-400 px-1.5 text-xs font-semibold text-amber-950">{unread}</span>}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
