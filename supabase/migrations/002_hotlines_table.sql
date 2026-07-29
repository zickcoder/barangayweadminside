-- Create emergency_hotlines table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.emergency_hotlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL, -- 'POLICE', 'FIRE', 'AMBULANCE', 'HOSPITAL', 'BARANGAY'
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    is_local BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    priority INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist even if the table was created previously by another system
ALTER TABLE public.emergency_hotlines ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.emergency_hotlines ADD COLUMN IF NOT EXISTS priority INT DEFAULT 1;
ALTER TABLE public.emergency_hotlines ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

-- Enable RLS on emergency_hotlines
ALTER TABLE public.emergency_hotlines ENABLE ROW LEVEL SECURITY;

-- Allow public read & write policies
CREATE POLICY "Allow public read emergency_hotlines" ON public.emergency_hotlines FOR SELECT USING (true);
CREATE POLICY "Allow public insert emergency_hotlines" ON public.emergency_hotlines FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update emergency_hotlines" ON public.emergency_hotlines FOR UPDATE USING (true);
CREATE POLICY "Allow public delete emergency_hotlines" ON public.emergency_hotlines FOR DELETE USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_hotlines;

-- Seed default hotlines from the mobile app using valid UUID strings
INSERT INTO public.emergency_hotlines (id, category, name, phone_number, is_local, description, priority, status) VALUES
('11111111-1111-1111-1111-111111111111'::uuid, 'POLICE', 'PCP Barangay 178', '(02) 8961-1050', true, 'Primary police contact for Barangay 178 Camarin', 1, 'ACTIVE'),
('22222222-2222-2222-2222-222222222222'::uuid, 'POLICE', 'National Police', '911', false, 'National Emergency Hotline', 2, 'ACTIVE'),
('33333333-3333-3333-3333-333333333333'::uuid, 'FIRE', 'Caloocan Fire Station', '(02) 8361-2741', true, 'Local Fire and Rescue Unit', 3, 'ACTIVE'),
('44444444-4444-4444-4444-444444444444'::uuid, 'FIRE', 'Bureau of Fire Protection', '911', false, 'National Fire Protection Hotline', 4, 'ACTIVE'),
('55555555-5555-5555-5555-555555555555'::uuid, 'AMBULANCE', 'Barangay 178 Rescue', '(02) 8961-1234', true, 'Barangay Emergency Medical Services', 5, 'ACTIVE'),
('66666666-6666-6666-6666-666666666666'::uuid, 'AMBULANCE', 'National Red Cross', '143', false, 'Philippine Red Cross Emergency', 6, 'ACTIVE'),
('77777777-7777-7777-7777-777777777777'::uuid, 'HOSPITAL', 'Caloocan City Medical Center', '(02) 8351-5060', true, 'Public City Hospital services', 7, 'ACTIVE'),
('88888888-8888-8888-8888-888888888888'::uuid, 'BARANGAY', 'Barangay 178 Hall', '(02) 8961-1000', true, 'Barangay Hall Administration Desk', 8, 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET
    category = EXCLUDED.category,
    name = EXCLUDED.name,
    phone_number = EXCLUDED.phone_number,
    is_local = EXCLUDED.is_local;
