-- ============================================
-- BlockDrop Tetris Game - Database Setup
-- ============================================
-- Run this script in Supabase SQL Editor
-- to create the scores table and policies
-- ============================================

-- Create the scores table
CREATE TABLE IF NOT EXISTS public.scores (
    id BIGSERIAL PRIMARY KEY,
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    lines INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert scores
CREATE POLICY "Enable insert for all users"
ON public.scores
FOR INSERT
TO public
WITH CHECK (true);

-- Create policy to allow anyone to read scores
CREATE POLICY "Enable select for all users"
ON public.scores
FOR SELECT
TO public
USING (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS scores_score_idx ON public.scores (score DESC);
CREATE INDEX IF NOT EXISTS scores_created_at_idx ON public.scores (created_at DESC);

-- Display success message
SELECT 'Database setup complete! ✅' AS status;
