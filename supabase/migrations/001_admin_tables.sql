-- ─── NEW ADMINISTRATIVE PORTAL TABLES ──────────────────────────────────────────

-- 1. Incoming Incidents Table (API-Ready Incident Queue)
CREATE TABLE IF NOT EXISTS public.incoming_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id VARCHAR(50) UNIQUE NOT NULL,
    source_subsystem VARCHAR(100) NOT NULL,
    incident_type VARCHAR(50) NOT NULL, -- 'FIRE', 'FLOOD', 'CRIME', 'MEDICAL', 'EARTHQUAKE', 'OTHER'
    priority VARCHAR(50) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    reported_by VARCHAR(100),
    date_reported TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW', -- 'PENDING_REVIEW', 'READY_FOR_BROADCAST', 'BROADCASTED', 'RESOLVED'
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on incoming_incidents
ALTER TABLE public.incoming_incidents ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated/anonymous operations (since client handles api calls directly for simplicity/testing)
CREATE POLICY "Allow public read incoming_incidents" ON public.incoming_incidents FOR SELECT USING (true);
CREATE POLICY "Allow public insert incoming_incidents" ON public.incoming_incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update incoming_incidents" ON public.incoming_incidents FOR UPDATE USING (true);

-- Enable Realtime for incoming_incidents
ALTER PUBLICATION supabase_realtime ADD TABLE public.incoming_incidents;


-- 2. Broadcast Logs Table (Operator Broadcast Activity)
CREATE TABLE IF NOT EXISTS public.broadcast_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES public.incoming_incidents(id) ON DELETE SET NULL,
    alert_id UUID, -- Links to alerts table if applicable
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    language VARCHAR(50) NOT NULL, -- 'English', 'Tagalog'
    operator VARCHAR(100) NOT NULL DEFAULT 'Administrator',
    priority VARCHAR(50) NOT NULL, -- 'NORMAL', 'WARNING', 'EMERGENCY'
    emergency_type VARCHAR(50) NOT NULL,
    channel VARCHAR(100) NOT NULL DEFAULT 'Mobile Application',
    broadcast_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'SENT' -- 'SENT', 'FAILED'
);

-- Enable RLS on broadcast_logs
ALTER TABLE public.broadcast_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read/insert for testing / dashboard purposes
CREATE POLICY "Allow public read broadcast_logs" ON public.broadcast_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert broadcast_logs" ON public.broadcast_logs FOR INSERT WITH CHECK (true);

-- Enable Realtime for broadcast_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_logs;


-- 3. Alert enhancements (Check if columns like emergency_type, language, operator exist, add them if not)
-- Note: Supabase alerts table usually has: id, title, preview, message, priority, created_at.
-- Let's add additional helper columns if they don't exist yet to enrich search/logs:
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS emergency_type VARCHAR(50) DEFAULT 'OTHER';
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'English';
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS operator VARCHAR(100) DEFAULT 'Administrator';
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS incident_id VARCHAR(100);
