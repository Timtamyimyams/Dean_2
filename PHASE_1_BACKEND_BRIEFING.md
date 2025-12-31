# Phase 1: Backend Setup - Backend Developer Briefing

## Your Assignment
Create and configure the Supabase database tables and RLS policies needed for real-time collaboration.

## Context
- **Supabase Project:** https://wdxeucdxzwerqkdicwgq.supabase.co
- **Existing:** Supabase client is already initialized in ProjectPlanningBoard.jsx (lines 8-12)
- **Current Issue:** Tables likely don't exist or RLS policies not configured
- **Target Scale:** 2-5 concurrent users per board
- **Conflict Resolution:** Last-write-wins (timestamp-based)

## Your Tasks

### Task 1: Create `boards` Table
This table stores shared board documents and will receive realtime updates.

```sql
CREATE TABLE IF NOT EXISTS public.boards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boards_user_id ON public.boards(user_id);
CREATE INDEX IF NOT EXISTS idx_boards_updated_at ON public.boards(updated_at);
```

**Notes:**
- `id` = board ID (format: "board-<timestamp>" or user's choice)
- `data` = JSON containing: { elements: [], groups: [], zoom: 1 }
- RLS must allow any authenticated user to READ all boards
- RLS must allow users to UPDATE boards they can read

### Task 2: Create `presence` Table
Tracks live cursor positions and which users are online.

```sql
CREATE TABLE IF NOT EXISTS public.presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id TEXT NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  cursor_x FLOAT NOT NULL,
  cursor_y FLOAT NOT NULL,
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presence_board_id ON public.presence(board_id);
CREATE INDEX IF NOT EXISTS idx_presence_user_id ON public.presence(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_last_heartbeat ON public.presence(last_heartbeat);
```

**Notes:**
- Users INSERT their own presence record
- Users UPDATE their own record to heartbeat and move cursor
- Other users READ all presence records for a board
- Set up a cleanup trigger or use edge function to remove stale (>30s) records

### Task 3: Create `messages` Table
Stores chat messages for each board.

```sql
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id TEXT NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_board_id ON public.messages(board_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
```

**Notes:**
- RLS: Users can INSERT messages for any board
- RLS: Users can SELECT messages from any board
- Messages are immutable (no UPDATE/DELETE in MVP)

### Task 4: Create `comments` Table
Stores comments attached to specific elements.

```sql
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id TEXT NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  element_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_board_id ON public.comments(board_id);
CREATE INDEX IF NOT EXISTS idx_comments_element_id ON public.comments(element_id);
```

**Notes:**
- Comments are tied to specific elements via element_id
- RLS: Users can INSERT/UPDATE/SELECT comments on shared boards

### Task 5: Configure Row Level Security (RLS)

#### Enable RLS on all tables:
```sql
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
```

#### Create RLS Policies

**For `boards` table:**
```sql
-- Allow anyone to read all boards
CREATE POLICY "Allow users to read all boards"
ON public.boards
FOR SELECT
USING (true);

-- Allow users to insert boards (public collaboration)
CREATE POLICY "Allow users to insert boards"
ON public.boards
FOR INSERT
WITH CHECK (true);

-- Allow users to update boards
CREATE POLICY "Allow users to update boards"
ON public.boards
FOR UPDATE
USING (true)
WITH CHECK (true);
```

**For `presence` table:**
```sql
-- Allow reading all presence records
CREATE POLICY "Allow users to read presence"
ON public.presence
FOR SELECT
USING (true);

-- Allow users to insert their own presence
CREATE POLICY "Allow users to insert presence"
ON public.presence
FOR INSERT
WITH CHECK (user_id = current_user_id());

-- Allow users to update their own presence
CREATE POLICY "Allow users to update own presence"
ON public.presence
FOR UPDATE
USING (user_id = current_user_id())
WITH CHECK (user_id = current_user_id());

-- Allow users to delete their own presence
CREATE POLICY "Allow users to delete own presence"
ON public.presence
FOR DELETE
USING (user_id = current_user_id());
```

**For `messages` table:**
```sql
-- Allow users to read all messages
CREATE POLICY "Allow users to read messages"
ON public.messages
FOR SELECT
USING (true);

-- Allow users to insert messages
CREATE POLICY "Allow users to insert messages"
ON public.messages
FOR INSERT
WITH CHECK (true);
```

**For `comments` table:**
```sql
-- Allow users to read all comments
CREATE POLICY "Allow users to read comments"
ON public.comments
FOR SELECT
USING (true);

-- Allow users to insert comments
CREATE POLICY "Allow users to insert comments"
ON public.comments
FOR INSERT
WITH CHECK (true);

-- Allow users to update comments
CREATE POLICY "Allow users to update comments"
ON public.comments
FOR UPDATE
USING (user_id = current_user_id())
WITH CHECK (user_id = current_user_id());
```

### Task 6: Enable Realtime for Relevant Tables

In Supabase Dashboard > Replication:
- Enable replication for `boards` table
- Enable replication for `presence` table
- Enable replication for `messages` table
- Enable replication for `comments` table

This allows frontend to subscribe to postgres_changes events.

## Validation Checklist

- [ ] All 4 tables created successfully
- [ ] All indexes created
- [ ] RLS enabled on all tables
- [ ] RLS policies created for all tables
- [ ] Realtime replication enabled
- [ ] Can insert test row in each table
- [ ] Can read test rows from another user's context
- [ ] No errors in table creation

## Output Expected

When complete, provide:
1. Confirmation all tables created
2. Confirmation all RLS policies working
3. Confirmation realtime enabled
4. Any issues encountered and how resolved
5. Ready for Frontend Developer to proceed

## Timeline
This should take 30-45 minutes to set up and test.

