import type { ReactNode } from 'react'
import { Icon } from './Icon'

/**
 * Esqueletos de carregamento. Cada um copia o tamanho do conteúdo real para a
 * tela não "pular" quando os dados chegam. Só aparecem na primeira carga: o
 * React Query guarda o resto em cache.
 */

/** Um bloco cinza pulsante. Sem animação para quem pediu menos movimento no sistema. */
export function Skeleton({ className = '' }: { className?: string }) {
  const shape = className.includes('rounded') ? '' : 'rounded-md'
  return <span className={`block animate-pulse bg-stone-200 motion-reduce:animate-none ${shape} ${className}`} />
}

/**
 * Embrulha um esqueleto: avisa o leitor de tela que está carregando e esconde
 * os blocos dele. Entra com atraso curto para não piscar em cargas rápidas.
 */
export function Loading({ label = 'Carregando...', className = '', children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" className="skeleton-in">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className={className}>{children}</div>
    </div>
  )
}

export function ActivitySkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Loading label="Carregando novidades...">
      <Skeleton className="mt-1 mb-1 h-3 w-16" />
      <ul className="divide-y divide-stone-100">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex gap-3 py-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2 pt-0.5">
              <Skeleton className={`h-3.5 ${index % 2 ? 'w-2/3' : 'w-4/5'}`} />
              <Skeleton className="h-3 w-20" />
            </div>
          </li>
        ))}
      </ul>
    </Loading>
  )
}

export function FolderCardSkeleton() {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
      <div className="mt-4 flex gap-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-8" />
      </div>
    </div>
  )
}

export function FolderGridSkeleton({ count = 3, className = 'grid gap-3' }: { count?: number; className?: string }) {
  return (
    <Loading label="Carregando pastas..." className={className}>
      {Array.from({ length: count }, (_, index) => <FolderCardSkeleton key={index} />)}
    </Loading>
  )
}

export function DocumentRowsSkeleton({ rows = 3, compact = false }: { rows?: number; compact?: boolean }) {
  return (
    <Loading label="Carregando arquivos...">
      <ul className="divide-y divide-stone-100">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className={`flex items-center ${compact ? 'gap-3 px-4' : 'gap-4 px-5'} py-3`}>
            <Skeleton className={`${compact ? 'h-8 w-10' : 'h-10 w-12'} shrink-0 rounded`} />
            <div className="flex-1 space-y-2">
              <Skeleton className={`h-3.5 ${index % 2 ? 'w-1/2' : 'w-2/3'}`} />
              <Skeleton className="h-3 w-32" />
            </div>
          </li>
        ))}
      </ul>
    </Loading>
  )
}

export function CommentsSkeleton() {
  return (
    <Loading label="Carregando comentários..." className="space-y-4">
      {[0, 1].map((index) => (
        <div key={index} className="flex gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 pt-0.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </Loading>
  )
}

/** Tela de uma pasta enquanto ela ainda não chegou: trilha, título, arquivos e conversa. */
export function FolderPageSkeleton() {
  return (
    <Loading label="Carregando pasta...">
      <Skeleton className="mb-4 h-4 w-40" />
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200 lg:col-span-3">
          <div className="border-b border-stone-100 px-5 py-3"><Skeleton className="h-4 w-20" /></div>
          <DocumentRowsSkeleton />
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200 lg:col-span-2">
          <Skeleton className="mb-5 h-5 w-48" />
          <CommentsSkeleton />
        </div>
      </div>
    </Loading>
  )
}

/** Enquanto a sessão é conferida: a moldura do site, sem dados. */
export function AppSkeleton() {
  return (
    <Loading label="Abrindo o mural..." className="min-h-screen">
      <div className="h-[7.75rem] bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pt-5 text-white sm:px-6">
          <span className="flex size-10 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <Icon name="leaf" className="size-6" />
          </span>
          <span className="text-lg font-semibold">Mural AgroMRO</span>
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div className="space-y-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-80 max-w-full" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="rounded-xl bg-white px-5 py-2 shadow-sm ring-1 ring-stone-200 lg:col-span-3"><ActivitySkeleton /></div>
          <div className="lg:col-span-2"><FolderGridSkeleton /></div>
        </div>
      </div>
    </Loading>
  )
}
