-- Create message status type
CREATE TYPE message_status AS ENUM('good', 'normal', 'needs improvement');

-- Add Feedback Column for user messages
ALTER TABLE messages
ADD COLUMN feedback VARCHAR(255),
ADD COLUMN status message_status;