-- Create Interests Table
CREATE TABLE IF NOT EXISTS interests (
    aID UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pID UUID REFERENCES personas(pID) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- Policy: Only Authenticated Users can read Interests
CREATE POLICY "Authenticated Users can read Interests"
ON interests
FOR SELECT
USING (auth.uid() is NOT NULL);

-- Policy: Only Admins can modify Interests
CREATE POLICY "Admins can update Interests"
ON interests
FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete Interests"
ON interests
FOR DELETE
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert Interests"
ON interests
FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));