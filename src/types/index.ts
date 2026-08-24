// ─── Existing Mobile App Types ────────────────────────────────────────────────

export interface Alert {
  id: string
  title: string
  preview: string
  message: string
  priority: 'NORMAL' | 'WARNING' | 'EMERGENCY'
  emergency_type?: string
  language?: string
  operator?: string
  incident_id?: string
  created_at: string
}

export interface EmergencyHotline {
  id: string
  category: 'POLICE' | 'FIRE' | 'AMBULANCE' | 'HOSPITAL' | 'BARANGAY' | string
  name: string
  phone_number: string
  is_local: boolean
  description?: string
  priority?: number
  status?: 'ACTIVE' | 'INACTIVE'
  created_at?: string
}

export interface NotificationAcknowledgement {
  alert_id: string
  acknowledged_at: string
  device_id: string
}

export interface AppSettings {
  device_id: string
  dark_mode: boolean
  sound_enabled: boolean
  vibration_enabled: boolean
  notifications_enabled: boolean
  updated_at: string
}

// ─── New Admin Tables ──────────────────────────────────────────────────────────

export type IncidentStatus = 'Pending' | 'Seen' | 'Broadcasted' | 'Disregarded'
export type IncidentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type IncidentType = 'FIRE' | 'FLOOD' | 'CRIME' | 'MEDICAL' | 'EARTHQUAKE' | 'OTHER'

export interface IncomingIncident {
  id: string
  incident_id: string
  source_subsystem: string
  incident_type: IncidentType
  priority: IncidentPriority
  location: string
  description: string
  reported_by?: string
  date_reported: string
  status: IncidentStatus
  created_at: string
  metadata?: Record<string, unknown>
}

export interface BroadcastLog {
  id: string
  incident_id?: string
  alert_id?: string
  title: string
  message: string
  language: 'English' | 'Tagalog'
  operator: string
  priority: string
  emergency_type: string
  channel: string
  broadcast_time: string
  status: 'SENT' | 'FAILED'
}

// ─── API Payload Types ─────────────────────────────────────────────────────────

export interface IncomingIncidentPayload {
  incident_id: string
  incident_type: IncidentType
  priority: IncidentPriority
  location: string
  description: string
  reported_by?: string
  date_reported: string
  source_subsystem: string
  status?: IncidentStatus
  metadata?: Record<string, unknown>
}

// ─── Broadcast Form ────────────────────────────────────────────────────────────

export interface BroadcastFormData {
  title: string
  description: string
  location?: string
  priority: 'NORMAL' | 'WARNING' | 'EMERGENCY'
  emergency_type: IncidentType | 'OTHER'
  language: 'English' | 'Tagalog'
  channel: 'Mobile Application'
  operator: string
}

// ─── Dashboard Analytics ───────────────────────────────────────────────────────

export interface AnalyticsSummary {
  todayBroadcasts: number
  monthBroadcasts: number
  totalAlerts: number
  pendingIncidents: number
}

// Filter Disregarded out of the queue in IncomingCommunications
// const filtered = incidents.filter(inc => {
//   if (inc.status === 'Broadcasted' || inc.status === 'Disregarded') return false
//   return true
// })

export interface IncidentChartData {
  name: string
  count: number
  type: IncidentType
}

export type TimeFilter = 'week' | 'month' | 'year'
