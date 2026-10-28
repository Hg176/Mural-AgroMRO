const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' })
const fullDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

export function timeAgo(date: string): string {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000
  if (Math.abs(seconds) < 60) return 'agora'

  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'agora'
}

export function formatDateTime(date: string): string {
  return fullDate.format(new Date(date))
}

/** "Hoje", "Ontem" ou "24 de outubro", para agrupar o feed por dia. */
export function dayLabel(date: string): string {
  const day = new Date(date)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (day.toDateString() === today.toDateString()) return 'Hoje'
  if (day.toDateString() === yesterday.toDateString()) return 'Ontem'
  return dayMonth.format(day)
}

export function fileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: unit === 0 ? 0 : 1 })} ${units[unit]}`
}

export function extension(name: string): string {
  const ext = name.includes('.') ? name.split('.').pop() : ''
  return ext ? ext.toUpperCase().slice(0, 4) : 'ARQ'
}

/** Página HTML: abre no visualizador isolado, não direto do Storage (que entrega como texto puro). */
export function isHtml(document: { name: string; mime_type: string | null }): boolean {
  return document.mime_type === 'text/html' || /\.html?$/i.test(document.name)
}

/** O navegador consegue mostrar sem baixar (PDF, imagem, texto, página HTML). */
export function isPreviewable(document: { name: string; mime_type: string | null }): boolean {
  const mime = document.mime_type
  return isHtml(document) || (!!mime && (mime.startsWith('image/') || mime.startsWith('text/') || mime === 'application/pdf'))
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}
