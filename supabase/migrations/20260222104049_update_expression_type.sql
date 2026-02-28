-- Create new expression type
CREATE TYPE eval_new_expression AS ENUM('neutral', 'happy', 'angry', 'worried', 'confused', 'scared');

-- Drop default
ALTER TABLE evaluations ALTER COLUMN expression DROP DEFAULT;

-- Alter table type
ALTER TABLE evaluations
ALTER COLUMN expression TYPE eval_new_expression
USING case expression
    WHEN 'neutral' THEN 'neutral'::eval_new_expression
    WHEN 'angry' THEN 'angry'::eval_new_expression
    WHEN 'happy' THEN 'happy'::eval_new_expression
    WHEN 'sad' THEN 'worried'::eval_new_expression
    WHEN 'shocked' THEN 'confused'::eval_new_expression
END;

-- Add default
ALTER TABLE evaluations
ALTER COLUMN expression SET DEFAULT 'neutral'::eval_new_expression;

-- Drop old expression type
DROP TYPE eval_expression;