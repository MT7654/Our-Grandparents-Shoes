-- Create Sender Type
CREATE TYPE message_sender AS ENUM('user', 'persona');

-- Create Messages Table
CREATE TABLE IF NOT EXISTS messages (
    mID UUID DEFAULT gen_random_uuid(),
    vID UUID REFERENCES conversations(vID) ON DELETE CASCADE NOT NULL,
    sender message_sender NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (vID, mID)
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read and modify their own messages
CREATE POLICY "Users can read their own Messages"
ON messages
FOR SELECT
USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.vID = messages.vID AND conversations.uID = auth.uid()));

CREATE POLICY "Users can update their own Messages"
ON messages
FOR UPDATE
USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.vID = messages.vID AND conversations.uID = auth.uid()));

CREATE POLICY "Users can delete their own Messages"
ON messages
FOR DELETE
USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.vID = messages.vID AND conversations.uID = auth.uid()));

CREATE POLICY "Users can insert their own Messages"
ON messages
FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM conversations WHERE conversations.vID = messages.vID AND conversations.uID = auth.uid()));

-- Policy: Admins can read all messages
CREATE POLICY "Admins can read all Messages"
ON messages
FOR SELECT
USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));