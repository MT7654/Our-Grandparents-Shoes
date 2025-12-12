-- Session 1: Margaret Thompson (2025-01-28)
INSERT INTO chats (pID, objective)
SELECT pID, 'Get the senior to talk about how they met their spouse'
FROM personas
WHERE name = 'Margaret Thompson';

-- Session 2: Robert Chen (2025-01-27)
INSERT INTO chats (pID, objective)
SELECT pID, 'Build rapport through active listening'
FROM personas
WHERE name = 'Robert Chen';