-- Remove unnecessaru columns from badges
ALTER TABLE badges
DROP COLUMN category, 
DROP COLUMN criteria_type, 
DROP COLUMN criteria_value,
DROP COLUMN description;

-- Add Badge Types
CREATE TYPE badge_type AS ENUM('First Convo', 'All Scenarios', 'All Hard');

-- Delete all current badges
DELETE FROM badges;

-- Add label column for badges
ALTER TABLE badges
ADD COLUMN label badge_type NOT NULL;

-- Create past conversation views
CREATE VIEW conversation_sessions
WITH(security_invoker = true)
AS SELECT vid, scenario_name, difficulty, created_at, objective_met
FROM conversations;

-- Create review sessions views
CREATE VIEW review_sessions
WITH(security_invoker = true)
AS SELECT C.vid, C.difficulty, C.created_at, C.objective_met, M.content, M.feedback, M.status
FROM conversations C JOIN messages M ON m.vid = C.vid
WHERE M.sender = 'user';

-- Create trigger to award First Convo completion badge
CREATE OR REPLACE FUNCTION public.award_first_convo_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    badge_id UUID;
    convo_count INT;
BEGIN
    -- Find UUID of first convo completion badge
    SELECT bid INTO badge_id
    FROM badges
    WHERE label = 'First Convo';

    -- Calculate convo count
    SELECT COUNT(*) INTO convo_count
    FROM conversations
    WHERE uID = NEW.uID AND completed = true;

    -- Award badge is convo_count = 1
    IF convo_count = 1 THEN
        INSERT INTO achievements (bID, uID)
        VALUES (badge_id, NEW.uID)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- Set Function to Postgres Owner
ALTER FUNCTION public.award_first_convo_badge() OWNER TO postgres;

-- Attach Trigger to Conversation Table
CREATE TRIGGER award_first_convo_achievement
AFTER INSERT ON conversations
FOR EACH ROW
EXECUTE FUNCTION award_first_convo_badge();

-- Create trigger to award all scenarios completion badge
CREATE OR REPLACE FUNCTION public.award_all_scenarios_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    badge_id UUID;
    scenario_count INT;
BEGIN
    -- Find UUID of all scenarios completion badge
    SELECT bid INTO badge_id
    FROM badges
    WHERE label = 'All Scenarios';

    -- Calculate scenario count
    SELECT COUNT(DISTINCT scenario_name) INTO scenario_count
    FROM conversations
    WHERE uID = NEW.uID AND completed = true;

    -- Award badge is scenario_count = 3
    IF scenario_count = 3 THEN
        INSERT INTO achievements (bID, uID)
        VALUES (badge_id, NEW.uID)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- Set Function to Postgres Owner
ALTER FUNCTION public.award_all_scenarios_badge() OWNER TO postgres;

-- Attach Trigger to Conversation Table
CREATE TRIGGER award_all_scenarios_achievement
AFTER INSERT ON conversations
FOR EACH ROW
EXECUTE FUNCTION award_all_scenarios_badge();

-- Create trigger to award hard mode completion badge
CREATE OR REPLACE FUNCTION public.award_all_hard_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    badge_id UUID;
    hard_count INT;
BEGIN
    -- Find UUID of hard mode completion badge
    SELECT bid INTO badge_id
    FROM badges
    WHERE label = 'All Hard';

    -- Get completed
    SELECT COUNT(DISTINCT scenario_name) INTO hard_count
    FROM conversations
    WHERE uID = NEW.uID AND difficulty = 'Hard' AND completed = true;

    -- Award badge if completed
    IF hard_count = 3 THEN
        INSERT INTO achievements (bID, uID)
        VALUES (badge_id, NEW.uID)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- Set Function to Postgres Owner
ALTER FUNCTION public.award_all_hard_badge() OWNER TO postgres;

-- Attach Trigger to Conversation Table
CREATE TRIGGER award_all_hard_achievement
AFTER INSERT ON conversations
FOR EACH ROW
EXECUTE FUNCTION award_all_hard_badge();