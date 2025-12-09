-- Create Score Table
CREATE TABLE IF NOT EXISTS scores (
    sID UUID DEFAULT gen_random_uuid(),
    vID UUID REFERENCES conversations(vID) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    metric_value INT NOT NULL DEFAULT 0 CHECK(metric_value >= 0 AND metric_value <= 100),
    PRIMARY KEY (vID, sID),
    UNIQUE (vID, metric_name)
);

-- Enable Row Level Security
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own Score
CREATE POLICY "Users can read their own Score"
ON scores
FOR SELECT
USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.vID = scores.vID AND conversations.uID = auth.uid()));

-- Policy: Admins can read all Scores
CREATE POLICY "Admins can read all Scores"
ON scores
FOR SELECT
USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

-- Policy: Users can never insert or update into scores directly
CREATE POLICY "Users cannot insert or update scores"
ON scores
FOR all
USING (false)
WITH CHECK (false);