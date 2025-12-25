-- Create Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
    bID UUID REFERENCES badges(bID) ON DELETE CASCADE,
    uID UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (bID, uID)
);

-- Enable Row Level Security
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own achievements
CREATE POLICY "Users can read their own achievements"
ON achievements
FOR SELECT
USING (uID = auth.uid());

-- Policy: Admins can read all achievements
CREATE POLICY "Admins can read all achievements"
ON achievements
FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

