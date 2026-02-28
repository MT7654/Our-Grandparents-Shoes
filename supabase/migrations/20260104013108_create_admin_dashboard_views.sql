-- Fix User Dashboard View Statistic Error
DROP VIEW IF EXISTS statistics;

CREATE VIEW statistics 
WITH(security_invoker = true)
AS WITH 
total_chats AS (
    SELECT COUNT(*)::float AS total FROM chats
),
conv AS (
    SELECT 
        COUNT(C.vid)::float AS total_sessions,
        AVG(score) AS average_score,
        COUNT(DISTINCT C.cid) FILTER (WHERE S.completed)::float AS completed_chats
    FROM conversation_sessions S JOIN conversations C ON C.vid = S.vid
),
category_totals AS (
    SELECT 
        metric_name,
        SUM(metric_value) AS total_value
    FROM scores
    GROUP BY metric_name
),
best_cat AS (
    SELECT metric_name
    FROM category_totals
    WHERE total_value = (SELECT MAX(total_value) FROM category_totals)
    LIMIT 1
)
SELECT 
    conv.total_sessions,
    conv.average_score,
    (conv.completed_chats / total_chats.total * 100) AS completion_rate,
    best_cat.metric_name AS best_category
FROM conv, total_chats, best_cat;

-- Create View to view Volunteer Details
CREATE VIEW statistics_by_volunteers
WITH (security_invoker = true)
AS WITH
total_chats AS (
    SELECT COUNT(DISTINCT cid):: float as total FROM chats
),
conv AS (
    SELECT 
        C.uid,
        COUNT(C.vid)::float AS total_sessions,
        AVG(score) AS average_score,
        COUNT(DISTINCT C.cid) FILTER (WHERE S.completed)::float AS completed_chats
    FROM conversation_sessions S JOIN conversations C ON C.vid = S.vid
    GROUP BY C.uid
)
SELECT 
    conv.uid, 
    P.full_name, 
    P.email,
    P.created_at,
    P.last_active,
    P.user_id,
    conv.total_sessions, 
    conv.average_score AS average_score, 
    conv.completed_chats / total_chats.total * 100 AS completion_rate
FROM conv CROSS JOIN total_chats JOIN profiles P ON conv.uid = P.user_id;

-- Create View to view Chat Progression
CREATE VIEW volunteer_chat_progression
WITH (security_invoker = true)
AS SELECT
    C.cid, 
    P.name as persona_name, 
    CH.objective as chat_objective,
    C.uid,
    R.score,
    C.created_at
FROM conversations C 
JOIN average_score_conversations R ON C.vid = R.vid
JOIN chats CH ON C.cid = CH.cid
JOIN personas P ON CH.pid = P.pid;

