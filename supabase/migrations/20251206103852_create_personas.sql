-- Create Personas Table
CREATE TABLE IF NOT EXISTS personas (
    pID UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    age INT NOT NULL,
    personality TEXT NOT NULL,
    avatar_url TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

-- Policy: Only Authenticated Users can read Personas
CREATE POLICY "Authenticated Users can read Personas"
ON personas
FOR SELECT
USING (auth.uid() is NOT NULL);

-- Policy: Only Admins can modify Personas
CREATE POLICY "Admins can update Personas"
ON personas
FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete Personas"
ON personas
FOR DELETE
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert Personas"
ON personas
FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));