-- Create Trigger Function
CREATE OR REPLACE FUNCTION prevent_recent_duplicate_messages()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM messages
        WHERE vID = NEW.vID
          AND sender = NEW.sender
          AND content = NEW.content
          AND sent_at >= now() - interval '30 seconds'
    ) THEN
        RAISE EXCEPTION 'Duplicate message detected: same content sent within 30 seconds';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach Trigger to Table
CREATE TRIGGER unique_recent_message
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION prevent_recent_duplicate_messages();
