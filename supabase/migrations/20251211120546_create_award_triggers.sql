-- Create Trigger Function to award Skill Badges
CREATE OR REPLACE FUNCTION public.insert_skill_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    skill_badge RECORD;
    conv_user UUID;
BEGIN
    -- Find UUID of user who owns the Score
    SELECT uID INTO conv_user
    FROM conversations
    WHERE vID = NEW.vID;

    -- Check if the user has achieved the skill specific badge
    FOR skill_badge IN (
        SELECT bID, criteria_type, criteria_value
        FROM badges
        WHERE category = 'Skill'
    ) LOOP
        IF NEW.metric_name = skill_badge.criteria_type::TEXT AND
            NEW.metric_value >= skill_badge.criteria_value THEN
            INSERT INTO achievements (bID, uID)
            VALUES (skill_badge.bID, conv_user)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

-- Set Function to Postgres Owner
ALTER FUNCTION public.insert_skill_achievements() OWNER TO postgres;

-- Attach Trigger to Scores Table
CREATE TRIGGER award_skill_badges
AFTER INSERT ON scores
FOR EACH ROW
EXECUTE FUNCTION insert_skill_achievements();

-- Create Trigger Function to award Progression Badges
CREATE OR REPLACE FUNCTION public.insert_progression_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    prog_badge RECORD;
    conversation_count INT;
    session_count INT;
BEGIN
    -- Calculate Conversation Count
    SELECT COUNT(DISTINCT cID)
    INTO conversation_count
    FROM conversations
    WHERE uID = NEW.uID;

    -- Calculate Session Count
    SELECT COUNT(*)
    INTO session_count
    FROM conversations
    WHERE uID = NEW.uID;

    -- Check if the user has achieved the progression specific badge
    FOR prog_badge IN (
        SELECT bID, criteria_type, criteria_value
        FROM badges
        WHERE category = 'Progression'
    ) LOOP
        IF prog_badge.criteria_type = 'Conversation Count' AND
            conversation_count >= prog_badge.criteria_value THEN

            INSERT INTO achievements (bID, uID)
            VALUES (prog_badge.bID, NEW.uID)
            ON CONFLICT DO NOTHING;

        ELSIF prog_badge.criteria_type = 'Session Count' AND
            session_count >= prog_badge.criteria_value THEN

            INSERT INTO achievements (bID, uID)
            VALUES (prog_badge.bID, NEW.uID)
            ON CONFLICT DO NOTHING;

        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

-- Set Function to Postgres Owner
ALTER FUNCTION public.insert_progression_achievements() OWNER TO postgres;

-- Attach Trigger to Conversations Table
CREATE TRIGGER award_progression_badges
AFTER INSERT ON conversations
FOR EACH ROW
EXECUTE FUNCTION insert_progression_achievements();
