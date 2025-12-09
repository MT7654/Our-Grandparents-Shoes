-- Create View to view Average Score
CREATE VIEW average_score_conversations 
WITH(security_invoker = true)
AS SELECT C.vid, AVG(S.metric_value) as score
FROM conversations C JOIN scores S ON C.vid = S.vid 
GROUP BY C.vid;

-- Create View to view Past Conversation Sessions
CREATE VIEW conversation_sessions 
WITH(security_invoker = true)
AS SELECT A.vid, P.name, V.created_at, A.score, C.objective, V.completed
FROM average_score_conversations A 
    JOIN conversations V ON A.vid = V.vid
    JOIN chats C ON V.cid = C.cid 
    JOIN personas P ON C.pid = P.pid;

-- Create View to view Statistics
CREATE VIEW statistics 
WITH(security_invoker = true)
AS WITH 
total_chats AS (
    SELECT COUNT(*)::float AS total FROM chats
),
conv AS (
    SELECT 
        COUNT(*)::float AS total_sessions,
        AVG(score) AS average_score,
        SUM(CASE WHEN completed THEN 1 ELSE 0 END)::float AS completed_sessions
    FROM conversation_sessions
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
    (conv.completed_sessions / total_chats.total * 100) AS completion_rate,
    best_cat.metric_name AS best_category
FROM conv, total_chats, best_cat;
