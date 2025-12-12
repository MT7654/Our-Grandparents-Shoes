-- Insert Margaret and Robert and capture their generated pIDs
WITH 
margaret_persona AS (
  INSERT INTO personas (name, age, personality, avatar_url)
  VALUES (
    'Margaret Thompson',
    78,
    'Warm and talkative grandmother who loves sharing stories about her youth. She can be forgetful but appreciates patience and kind reminders.',
    '/elderly-woman-cartoon-avatar-smiling-grandmother.jpg'
  )
  RETURNING pID
),
robert_persona AS (
  INSERT INTO personas (name, age, personality, avatar_url)
  VALUES (
    'Robert Chen',
    82,
    'Retired engineer who values precision and can be skeptical of new things. He warms up once he feels heard and respected.',
    '/elderly-man-cartoon-avatar-wise-grandfather.jpg'
  )
  RETURNING pID
)

-- Insert all interests
INSERT INTO interests (pID, name)
SELECT pID, name FROM margaret_persona, (VALUES
  ('Gardening'),
  ('Baking'),
  ('Family history')
) AS v(name)
UNION ALL
SELECT pID, name FROM robert_persona, (VALUES
  ('Chess'),
  ('World War II history'),
  ('Classical music')
) AS v(name);