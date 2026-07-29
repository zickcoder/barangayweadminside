import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export function generateIncidentId(): string {
  const now = new Date()
  const prefix = 'INC'
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `${prefix}-${date}-${rand}`
}

export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return
  const keys = Object.keys(data[0])
  const rows = [
    keys.join(','),
    ...data.map(row =>
      keys.map(k => {
        const v = row[k]
        const str = v == null ? '' : String(v)
        return `"${str.replace(/"/g, '""')}"`
      }).join(',')
    ),
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function priorityLabel(priority: string): string {
  const map: Record<string, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical',
    NORMAL: 'Normal',
    WARNING: 'Warning',
    EMERGENCY: 'Emergency',
  }
  return map[priority] ?? priority
}

export function incidentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    FIRE: 'Fire',
    FLOOD: 'Flood',
    CRIME: 'Crime',
    MEDICAL: 'Medical',
    EARTHQUAKE: 'Earthquake',
    OTHER: 'Other',
  }
  return map[type] ?? type
}

export function incidentTypeColor(type: string): string {
  const map: Record<string, string> = {
    FIRE: '#FF6B35',
    FLOOD: '#4A90D9',
    CRIME: '#9B59B6',
    MEDICAL: '#E74C3C',
    EARTHQUAKE: '#E67E22',
    OTHER: '#7F8C8D',
  }
  return map[type] ?? '#7F8C8D'
}
