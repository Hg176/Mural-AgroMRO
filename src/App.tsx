import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useAuth } from './lib/auth'
import { FeedPage } from './pages/FeedPage'
import { FoldersPage } from './pages/FoldersPage'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { NoAccess } from './pages/NoAccess'

// HashRouter (#/arquivos/1) porque o GitHub Pages não sabe redirecionar rotas de SPA.
export default function App() {
  const { loading, session, profile } = useAuth()

  if (loading) return null
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
