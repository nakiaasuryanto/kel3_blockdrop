# Supabase Setup Guide for BlockDrop

Follow these steps to enable the leaderboard feature with Supabase:

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - Project name: `blockdrop` (or any name you prefer)
   - Database password: (create a strong password)
   - Region: Choose closest to your location
5. Wait for the project to be set up (1-2 minutes)

## Step 2: Run SQL Setup (Quick & Easy!)

**Option A: Use the SQL file (Easiest)**
1. Open the file `setup_database.sql` in this folder
2. Copy all the content (Ctrl+A, Ctrl+C)
3. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
4. Click **"New Query"**
5. Paste the SQL code
6. Click **"Run"** or press `Ctrl+Enter`

**Option B: Copy from here**
1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy and paste this entire SQL code:

```sql
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS scores_score_idx ON public.scores (score DESC);
CREATE INDEX IF NOT EXISTS scores_created_at_idx ON public.scores (created_at DESC);
```

4. Click **"Run"** or press `Ctrl+Enter` (Cmd+Enter on Mac)

**Result:** You should see "Database setup complete! ✅" - That's it! Your database is ready to use.

---

## Alternative: Manual Setup via Table Editor

If you prefer to create the table manually instead of using SQL:

### Step 2 (Alternative): Create the Scores Table

1. In your Supabase dashboard, go to **Table Editor** (left sidebar)
2. Click **"New Table"**
3. Configure the table:
   - **Name**: `scores`
   - **Enable Row Level Security (RLS)**: ✓ (checked)

4. Add the following columns:

   | Name         | Type        | Default Value | Primary | Extra Settings       |
   |--------------|-------------|---------------|---------|----------------------|
   | id           | int8        | auto          | ✓       | Is Identity          |
   | player_name  | text        | -             |         | -                    |
   | score        | int4        | -             |         | -                    |
   | lines        | int4        | -             |         | -                    |
   | created_at   | timestamptz | now()         |         | -                    |

5. Click **Save**

### Step 3 (Alternative): Set Up Row Level Security (RLS) Policies

(Skip this if you used the SQL setup above - it's already done!)

1. Go to **Authentication** > **Policies** in the left sidebar
2. Find the `scores` table
3. Click **"New Policy"**
4. Create two policies:

#### Policy 1: Enable INSERT for everyone
- **Policy name**: `Enable insert for all users`
- **Allowed operation**: INSERT
- **Target roles**: `public`
- **USING expression**: `true`
- **WITH CHECK expression**: `true`

#### Policy 2: Enable SELECT for everyone
- **Policy name**: `Enable select for all users`
- **Allowed operation**: SELECT
- **Target roles**: `public`
- **USING expression**: `true`

---

## Step 3: Get Your Supabase Credentials

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **API** in the left menu
3. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

## Step 4: Update game.js

Open `game.js` and find these lines near the top (around line 23-24):

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
```

Replace them with your actual credentials:

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co';  // Your Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';  // Your anon key
```

## Step 5: Test It!

1. Open `index.html` in your browser
2. Enter your name in the input field
3. Play the game
4. When you get game over, the score should be saved automatically
5. Click "🏆 LEADERBOARD" to see all saved scores

## Troubleshooting

### "Supabase not configured" in console
- Make sure you replaced `YOUR_SUPABASE_URL_HERE` and `YOUR_SUPABASE_ANON_KEY_HERE` with actual values

### "Failed to save score"
- Check browser console (F12) for error messages
- Verify RLS policies are set correctly
- Make sure the table name is exactly `scores`
- Check that all columns exist with correct names and types

### Scores not appearing in leaderboard
- Go to Supabase Table Editor and verify data is being inserted
- Check browser console for errors
- Verify SELECT policy is enabled

## Features

✅ **Name Input**: Players must enter their name before starting
✅ **Auto-save**: Scores are automatically saved when game ends
✅ **Leaderboard**: Top 10 scores displayed with gold/silver/bronze medals
✅ **Real-time**: All players share the same global leaderboard

Enjoy your game! 🎮
