import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Política de segurança (CSP) do site publicado: a página só carrega código
 * dela mesma e só conversa com o Supabase do mural. Fica de fora do modo dev,
 * que injeta scripts inline para o recarregamento automático.
 */
function contentSecurityPolicy(supabaseUrl: string): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.bunny.net",
    "font-src https://fonts.bunny.net",
    "img-src 'self' data:",
    `connect-src 'self' ${supabaseUrl}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    name: 'mural-csp',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }],
  }
}

// No GitHub Pages o site fica em /<nome-do-repo>/; o workflow de deploy passa BASE_PATH.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    base: process.env.BASE_PATH ?? '/',
    plugins: [react(), tailwindcss(), contentSecurityPolicy(env.VITE_SUPABASE_URL ?? '')],
  }
})
