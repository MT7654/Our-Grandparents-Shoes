-- Create Types
CREATE TYPE eval_expression AS ENUM('happy', 'neutral', 'sad', 'angry', 'shocked');
CREATE TYPE eval_sentiment AS ENUM('positive', 'neutral', 'negative');

-- Create Evaluation Table
CREATE TABLE IF NOT EXISTS evaluations (
    eID UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vID UUID REFERENCES conversations(vID) ON DELETE CASCADE NOT NULL UNIQUE,
    sentiment eval_sentiment NOT NULL DEFAULT 'neutral',
    expression eval_expression NOT NULL DEFAULT 'neutral',
    rapport INT NOT NULL DEFAULT 50 CHECK(rapport <= 100 AND rapport >= 0),
    suggestion TEXT NOT NULL DEFAULT 'Continue showing genuine interest and empathy in the conversation'
);

-- Enable Row Level Security
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read the evaluation
CREATE POLICY "Users can read their own evaluation"
ON evaluations
FOR SELECT
USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.vID = evaluations.vID AND conversations.uID = auth.uid()));
