-- Prograssion Category Badges
INSERT INTO badges (name, description, category, criteria_type, criteria_value)
VALUES 
('First Conversation', 'Complete your first conversation', 'Progression', 'Conversation Count', 1),
('5 Sessions', 'Complete 5 sessions', 'Progression', 'Session Count', 5),
('10 Sessions', 'Complete 10 sessions', 'Progression', 'Session Count', 10);


-- Skill Category Badges
INSERT INTO badges (name, description, category, criteria_type, criteria_value)
VALUES
('Active Listener', 'Achieve a score greater than 90 in Active Listening', 'Skill', 'Active Listening', 90),
('Empathy Expert', 'Achieve a score greater than 90 in Empathy', 'Skill', 'Empathy', 90),
('Conversational Expert', 'Achieve a score greater than 90 in Conversational Flow', 'Skill', 'Conversational Flow', 90),
('Clear Speaker', 'Achieve a score greater than 90 in Clarity', 'Skill', 'Clarity', 90);

