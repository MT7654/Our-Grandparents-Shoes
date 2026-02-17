-- Create Difficulty Type
CREATE TYPE difficulty_level AS ENUM('Easy', 'Hard');

-- Add Difficult Level Column
ALTER TABLE conversations
ADD COLUMN difficulty difficulty_level NOT NULL DEFAULT('Easy');

-- Add Turns Column
ALTER TABLE conversations
ADD COLUMN turns INT NOT NULL;