-- Drop Foreign Key Constraint
ALTER TABLE conversations
DROP CONSTRAINT conversations_cid_fkey;

-- Drop award_progression_badges trigger
DROP TRIGGER IF EXISTS award_progression_badges ON conversations;

-- Drop all views
DROP VIEW statistics;
DROP VIEW volunteer_chat_progression;
DROP VIEW statistics_by_volunteers;
DROP VIEW conversation_sessions;
DROP VIEW average_score_conversations;

-- Drop chats table
DROP TABLE chats;

-- Drop interests table
DROP TABLE interests;

-- Drop personas table
DROP TABLE personas;

-- Drop cid column
ALTER TABLE conversations
DROP COLUMN cid;

-- Drop unique active conversation index
DROP INDEX IF EXISTS unique_active_conversation;

-- Create Scenario_name type
CREATE TYPE scenario_name as ENUM (
    'House Visit',
    'Emotional Listening Ear',
    'Resolve a Task'
);

-- Delete all fields from conversations (in case)
DELETE FROM conversations;

-- Add scenario_name column
ALTER TABLE conversations
ADD COLUMN scenario_name scenario_name NOT NULL;

-- Create unique active conversation index
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_conversation
ON conversations(uID, scenario_name)
WHERE completed = false;



