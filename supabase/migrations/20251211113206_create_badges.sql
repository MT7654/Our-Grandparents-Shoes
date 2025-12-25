-- Create Badge Categroy Types
CREATE TYPE badge_category AS ENUM('Progression', 'Skill');
-- Progression: badges that track the user's progression (e.g. "First Conversation", "5 Sessions", "10 Sessions")
-- Skill: badges that track the user's skills (e.g. "Empathy Expert", "Active Listener")
-- Create Badge Criteria Types

CREATE TYPE badge_criteria AS ENUM('Active Listening', 'Empathy', 'Conversational Flow', 'Clarity', 'Conversation Count', 'Session Count');
-- First 4 are for skill badges, Last 2 are for progression badges
-- Conversation Count: Distinct Chat with Distinct Personas
-- Session Count: Distinct Attempts with Repeated Personas

-- Create Badge Table
CREATE TABLE IF NOT EXISTS badges (
    bID UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category badge_category NOT NULL,
    criteria_type badge_criteria NOT NULL,
    criteria_value INT NOT NULL CHECK(criteria_value > 0 AND criteria_value <= 100)
);

-- Enable Row Level Security
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all badges
CREATE POLICY "Users can read all badges"
ON badges
FOR SELECT
USING (auth.uid() is NOT NULL);

-- Policy: Admins can insert badges
CREATE POLICY "Admins can insert badges"
ON badges
FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Policy: Admins can update badges
CREATE POLICY "Admins can update badges"
ON badges
FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Policy: Admins can delete badges
CREATE POLICY "Admins can delete badges"
ON badges
FOR DELETE
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
