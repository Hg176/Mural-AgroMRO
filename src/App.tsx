import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AppSkeleton } from './components/Skeleton'
import { useAuth } from './lib/auth'
import { FeedPage } from './pages/FeedPage'
import { FoldersPage } from './pages/FoldersPage'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { NoAccess } from './pages/NoAccess'
import { TrashPage } from './pages/TrashPage'

// HashRouter (#/arquivos/1) porque o GitHub Pages não sabe redirecionar rotas de SPA.
export default function App() {
  const { loading, session, profile, isAdmin } = useAuth()

  if (loading) return <AppSkeleton />
  if (!session) return <Login />
  if (!profile) return <NoAccess />

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="novidades" element={<FeedPage />} />
          <Route path="arquivos" element={<FoldersPage />} />
          <Route path="arquivos/:id" element={<FoldersPage />} />
          {isAdmin && <Route path="lixeira" element={<TrashPage />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
