-- Create Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    vID UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    uID UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
    cID UUID REFERENCES chats(cID) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    completed boolean NOT NULL DEFAULT false,
    objective_met boolean NOT NULL DEFAULT false,
    feedback TEXT NOT NULL DEFAULT 'No feedback submitted yet'
);

-- Create a Partial Unique Index
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_conversation
ON conversations(uID, cID)
WHERE completed = false;

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read and modify their own conversation
CREATE POLICY "Users can read their own Conversation"
ON conversations
FOR SELECT
USING (auth.uid() = uID);

CREATE POLICY "Users can update their own Conversation"
ON conversations
FOR UPDATE
USING (auth.uid() = uID);

CREATE POLICY "Users can delete their own Conversation"
ON conversations
FOR DELETE
USING (auth.uid() = uID);

CREATE POLICY "Users can insert their own Conversation"
ON conversations
FOR INSERT
WITH CHECK (auth.uid() = uID);

-- Policy: Admins can read all conversations
CREATE POLICY "Admins can read all Conversations"
ON conversations
FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));