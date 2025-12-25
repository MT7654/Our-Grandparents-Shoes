-- Create Trigger Function
CREATE OR REPLACE FUNCTION public.prevent_recent_duplicate_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.messages
        WHERE vID = NEW.vID
        AND sender = NEW.sender
        AND content = NEW.content
        AND sent_at >= now() - interval '30 seconds'
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'Duplicate message detected: same content sent within 30 seconds', ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;

-- Attach Trigger to Table
CREATE TRIGGER unique_recent_message
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION prevent_recent_duplicate_messages();
