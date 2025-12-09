-- Create Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY 
);

-- Enable Row Level Security
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Policy: Only Admins can read and modify themselves
CREATE POLICY "Admins can read themselves"
ON admins
FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Admins can insert themselves"
ON admins
FOR INSERT
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update themselves"
ON admins
FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Admins can delete themselves"
ON admins
FOR DELETE
USING (id = auth.uid());