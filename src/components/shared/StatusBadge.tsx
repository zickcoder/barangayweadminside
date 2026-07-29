import { cn } from '@/lib/utils'
import type { IncidentStatus, IncidentPriority } from '@/types'

interface StatusBadgeProps {
  status: IncidentStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const map: Record<IncidentStatus, { label: string; cls: string }> = {
    Pending:     { label: 'Pending',     cls: 'status-pending' },
    Seen:        { label: 'Viewed',      cls: 'status-ready' },
    Broadcasted: { label: 'Broadcasted', cls: 'status-broadcasted' },
  }

  const { label, cls } = map[status] ?? { label: status, cls: 'status-pending' }

  return <span className={cn(cls, className)}>{label}</span>
}

interface PriorityBadgeProps {
  priority: IncidentPriority | string
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const map: Record<string, string> = {
    LOW: 'badge-low',
    MEDIUM: 'badge-medium',
    HIGH: 'badge-high',
    CRITICAL: 'badge-critical',
    NORMAL: 'badge-low',
    WARNING: 'badge-medium',
    EMERGENCY: 'badge-critical',
  }

  const cls = map[priority] ?? 'badge-low'
  const label = priority.charAt(0) + priority.slice(1).toLowerCase()

  return <span className={cn(cls, className)}>{label}</span>
}

interface AlertPriorityBadgeProps {
  priority: 'NORMAL' | 'WARNING' | 'EMERGENCY' | string
  className?: string
}

export function AlertPriorityBadge({ priority, className }: AlertPriorityBadgeProps) {
  const map: Record<string, { label: string; cls: string }> = {
    NORMAL: { label: 'Normal', cls: 'badge-low' },
    WARNING: { label: 'Warning', cls: 'badge-medium' },
    EMERGENCY: { label: 'Emergency', cls: 'badge-critical' },
  }

  const { label, cls } = map[priority] ?? { label: priority, cls: 'badge-low' }
  return <span className={cn(cls, className)}>{label}</span>
}
