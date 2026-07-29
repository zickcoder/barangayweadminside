/**
 * Incident API Integration Service
 *
 * This is the API-ready integration layer for receiving incident data
 * from external Public Safety subsystems (Fire & Rescue, Community Policing, ERS, etc.)
 *
 * Architecture:
 * - External systems POST to /api/incoming-incidents (REST endpoint)
 * - This service normalizes the payload and saves to Supabase
 * - The admin portal then processes it through the review workflow
 *
 * Future integrations can call receiveIncident() without changing
 * any other part of the application.
 */

import { supabase } from './supabase'
import type { IncomingIncident, IncomingIncidentPayload, IncidentStatus } from '@/types'
import { generateIncidentId } from '@/lib/utils'

/**
 * Receive an incident from an external subsystem and save it to Supabase.
 * This is the main entry point for all incoming incident data.
 */
export async function receiveIncident(
  payload: IncomingIncidentPayload
): Promise<{ success: boolean; incident?: IncomingIncident; error?: string }> {
  try {
    const incident: Omit<IncomingIncident, 'id' | 'created_at'> = {
      incident_id: payload.incident_id || generateIncidentId(),
      source_subsystem: payload.source_subsystem,
      incident_type: payload.incident_type,
      priority: payload.priority,
      location: payload.location,
      description: payload.description,
      reported_by: payload.reported_by,
      date_reported: payload.date_reported || new Date().toISOString(),
      status: payload.status || 'Pending',
      metadata: payload.metadata,
    }

    const { data, error } = await supabase
      .from('incoming_incidents')
      .insert(incident)
      .select()
      .single()

    if (error) throw error

    return { success: true, incident: data }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

/**
 * Update the status of an incoming incident.
 */
export async function updateIncidentStatus(
  id: string,
  status: IncidentStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('incoming_incidents')
      .update({ status })
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

/**
 * Fetch all incoming incidents from Supabase.
 */
export async function fetchIncomingIncidents(): Promise<IncomingIncident[]> {
  const { data, error } = await supabase
    .from('incoming_incidents')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Fetch a single incident by ID.
 */
export async function fetchIncidentById(id: string): Promise<IncomingIncident | null> {
  const { data, error } = await supabase
    .from('incoming_incidents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

/**
 * Seed a demo incident for testing.
 * Only used in development.
 */
export async function seedDemoIncident(): Promise<void> {
  const demoSources = [
    'Emergency Response System',
    'Fire and Rescue Services',
    'Community Policing Unit',
    'Barangay CCTV Network',
    'Disaster Risk Reduction Office',
  ]

  const demoIncidents: IncomingIncidentPayload[] = [
    {
      incident_id: generateIncidentId(),
      source_subsystem: demoSources[1],
      incident_type: 'FIRE',
      priority: 'HIGH',
      location: 'Zone 4, Camarin, Caloocan City',
      description: 'Residential fire reported at a two-story house. Multiple families affected. Fire spreading to adjacent structures.',
      reported_by: 'BFP Unit 3',
      date_reported: new Date().toISOString(),
      status: 'Pending',
    },
    {
      incident_id: generateIncidentId(),
      source_subsystem: demoSources[2],
      incident_type: 'CRIME',
      priority: 'MEDIUM',
      location: 'Barangay 178 Market Area',
      description: 'Reported theft incident at the public market. Suspect apprehended. Residents advised to be cautious.',
      reported_by: 'PCP Barangay 178',
      date_reported: new Date(Date.now() - 3600000).toISOString(),
      status: 'Pending',
    },
    {
      incident_id: generateIncidentId(),
      source_subsystem: demoSources[0],
      incident_type: 'MEDICAL',
      priority: 'CRITICAL',
      location: 'Block 12, Camarin Road',
      description: 'Mass casualty incident. Multiple individuals requiring immediate medical attention. Ambulance dispatched.',
      reported_by: 'BHS Unit 1',
      date_reported: new Date(Date.now() - 7200000).toISOString(),
      status: 'Pending',
    },
  ]

  for (const payload of demoIncidents) {
    await receiveIncident(payload)
  }
}
