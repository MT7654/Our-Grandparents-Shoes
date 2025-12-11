-- Create Roles Type
CREATE TYPE Roles as ENUM('admin', 'user');

-- Create Admins Table
CREATE TABLE IF NOT EXISTS profiles (
    id BIGSERIAL PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    last_active DATE,
    no_of_sessions SMALLINT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    role Roles NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable: Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Function to check if the user is admin
CREATE OR REPLACE FUNCTION is_admin(uid UUID) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM profiles WHERE user_id = uid AND role = 'admin');
END;
$$;

-- Policy: Only Admins can read other profiles
CREATE POLICY "Admin can read other profiles"
ON profiles
FOR SELECT
USING (is_admin(auth.uid()));

-- Policy: Users can read and modify their own profiles
CREATE POLICY "Users can read their own profiles"
ON profiles
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profiles"
ON profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profiles"
ON profiles
FOR UPDATE
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own profiles"
ON profiles
FOR DELETE
USING (user_id = auth.uid());