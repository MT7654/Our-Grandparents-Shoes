-- Create Chats Table
CREATE TABLE IF NOT EXISTS chats (
    cID UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pID UUID REFERENCES personas(pID) ON DELETE CASCADE NOT NULL UNIQUE,
    objective TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Policy: Only Authenticated Users can read Chats
CREATE POLICY "Authenticated Users can read Chats"
ON chats
FOR SELECT
USING (auth.uid() is NOT NULL);

-- Policy: Only Admins can modify Chats
CREATE POLICY "Admins can insert Chats"
ON chats
FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update Chats"
ON chats
FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can modify Chats"
ON chats
FOR DELETE
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));