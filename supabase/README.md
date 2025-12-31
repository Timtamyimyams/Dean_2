# Supabase Setup for DEAN Planning Board

This directory contains database schemas and migrations for the DEAN Planning Board real-time collaboration feature.

## Overview

The collaboration system is built on 4 core tables:

1. **boards** - Store board state (elements, groups, viewport)
2. **presence** - Track active users and cursor positions
3. **messages** - Store chat messages for collaboration
4. **comments** - Store element-level comments and feedback

All tables include real-time subscription support and Row-Level Security (RLS) policies.

## Quick Start

### Prerequisites

- Supabase project created and configured
- Supabase CLI installed (optional but recommended)
- Environment variables configured in `.env.local`:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_project_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (backend only)
  ```

### Running Migrations

#### Option 1: Supabase Dashboard SQL Editor (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `migrations/001_collaboration_schema.sql`
5. Paste into the SQL editor
6. Click **Run** (or press `Ctrl+Enter`)
7. Verify all tables are created in the **Table Editor** section

#### Option 2: Supabase CLI (Recommended for Teams)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-id your_project_id
   ```

3. Run migrations:
   ```bash
   supabase migration up
   ```

4. Push to remote:
   ```bash
   supabase db push
   ```

#### Option 3: Direct Database Connection

If you have direct access to your Supabase PostgreSQL database:

```bash
psql postgres://postgres:password@db.xxxxx.supabase.co:5432/postgres \
  -f migrations/001_collaboration_schema.sql
```

## Schema Details

### boards Table

Stores the complete state of a planning board.

**Columns:**
- `id` (UUID) - Primary key
- `name` (TEXT) - Board title
- `elements` (JSONB) - Array of board elements (shapes, text, images, etc.)
- `groups` (JSONB) - Array of element groupings/selections
- `viewport` (JSONB) - Camera/zoom state `{x, y, zoom}`
- `created_by` (TEXT) - User ID of creator
- `updated_by` (TEXT) - User ID of last modifier
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Indexes:**
- `idx_boards_created_by` - Fast lookup by creator
- `idx_boards_updated_at` - Sorting by recent updates

### presence Table

Tracks active user sessions and cursor positions in real-time.

**Columns:**
- `id` (UUID) - Primary key
- `board_id` (UUID) - Foreign key to boards
- `user_id` (TEXT) - User identifier
- `cursor_x` (FLOAT) - Cursor X position on canvas
- `cursor_y` (FLOAT) - Cursor Y position on canvas
- `color` (TEXT) - User's assigned color (default: #3B82F6)
- `last_seen` (TIMESTAMPTZ) - Last activity timestamp

**Constraints:**
- `UNIQUE(board_id, user_id)` - Only one presence record per user per board
- Foreign key cascade - Deletes presence records when board is deleted

**Indexes:**
- `idx_presence_board_id` - Fast lookup by board
- `idx_presence_user_id` - Fast lookup by user
- `idx_presence_last_seen` - Cleanup of stale presence records

### messages Table

Stores chat/discussion messages for real-time collaboration communication.

**Columns:**
- `id` (UUID) - Primary key
- `board_id` (UUID) - Foreign key to boards
- `user_id` (TEXT) - Message author
- `content` (TEXT) - Message text
- `created_at` (TIMESTAMPTZ) - Message timestamp

**Indexes:**
- `idx_messages_board_id` - Fast lookup by board
- `idx_messages_user_id` - Fast lookup by user
- `idx_messages_created_at` - Sorting by timestamp

### comments Table

Stores element-specific comments and feedback threads.

**Columns:**
- `id` (UUID) - Primary key
- `board_id` (UUID) - Foreign key to boards
- `element_id` (TEXT) - ID of the commented element
- `user_id` (TEXT) - Comment author
- `content` (TEXT) - Comment text
- `resolved` (BOOLEAN) - Whether the comment is resolved
- `created_at` (TIMESTAMPTZ) - Comment timestamp

**Indexes:**
- `idx_comments_board_id` - Fast lookup by board
- `idx_comments_element_id` - Fast lookup by element
- `idx_comments_user_id` - Fast lookup by user
- `idx_comments_resolved` - Filter resolved status
- `idx_comments_created_at` - Sorting by timestamp

## Row-Level Security (RLS)

All tables have RLS enabled with MVP policies that allow all operations for all users.

### Current MVP Policies

Each table has 4 basic policies:
- **SELECT** - Allow all users to read
- **INSERT** - Allow all users to create
- **UPDATE** - Allow all users to modify
- **DELETE** - Allow all users to remove

### Future Production Policies

Replace these with proper role-based policies:

```sql
-- Example: Only creator can update their board
CREATE POLICY "Users can update own boards" ON boards
  FOR UPDATE
  USING (auth.uid()::text = created_by)
  WITH CHECK (auth.uid()::text = created_by);

-- Example: Users can only insert their own messages
CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Example: Only board collaborators can read boards
CREATE POLICY "Users can read shared boards" ON boards
  FOR SELECT
  USING (
    created_by = auth.uid()::text OR
    id IN (SELECT board_id FROM board_collaborators WHERE user_id = auth.uid()::text)
  );
```

## Real-time Subscriptions

The schema sets up a `realtime` publication covering all tables. To use real-time features in your frontend:

### Enable Realtime in Supabase Dashboard

1. Go to **Replication** section
2. Find the `realtime` publication
3. Ensure all 4 tables are included (boards, presence, messages, comments)
4. Toggle **Realtime** to **ON**

### Frontend Usage Example

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

// Subscribe to presence updates
supabase
  .channel(`board:${boardId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, (payload) => {
    console.log('Presence changed:', payload);
  })
  .subscribe();

// Subscribe to new messages
supabase
  .channel(`board:${boardId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
    console.log('New message:', payload.new);
  })
  .subscribe();
```

## Performance Considerations

### Indexes

All tables include strategic indexes for common queries:
- Foreign key lookups (board_id)
- User-based filtering (user_id, created_by)
- Timestamp sorting (created_at, updated_at, last_seen)
- Status filtering (resolved on comments)

### JSONB Storage

The `elements` and `groups` fields in boards use JSONB for:
- Efficient indexing with `CREATE INDEX ... USING GIN`
- Fast updates without full table rewrites
- Ability to query nested data

### Presence Cleanup

Consider implementing a cleanup job to remove stale presence records:

```sql
DELETE FROM presence
WHERE last_seen < now() - interval '5 minutes';
```

### Connection Pooling

Configure Supabase connection pooling in Project Settings:
- Session mode for most applications
- Transaction mode for high-throughput workloads

## Monitoring & Maintenance

### Check Table Sizes

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Monitor Active Connections

```sql
SELECT
  datname,
  count(*) as connections,
  usename,
  state
FROM pg_stat_activity
WHERE datname = 'postgres'
GROUP BY datname, usename, state;
```

### Replication Lag (if using replicas)

```sql
SELECT
  replay_lag,
  flush_lag,
  write_lag
FROM pg_stat_replication;
```

## Backup & Recovery

Supabase handles automated daily backups. To restore:

1. Go to **Backups** in Supabase dashboard
2. Select desired backup point
3. Click **Restore** and confirm

For manual backups:

```bash
pg_dump postgres://user:password@db.xxx.supabase.co/postgres \
  --schema public \
  > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Troubleshooting

### Tables Not Visible

- Confirm migration ran without errors (check Activity log)
- Refresh the Table Editor
- Check that you're in the correct schema (should be `public`)

### Real-time Not Working

- Ensure `realtime` publication is enabled in Replication settings
- Check browser console for connection errors
- Verify Row-Level Security policies allow the operation

### Performance Issues

- Run `ANALYZE` on tables after large data loads
- Check index usage: `SELECT * FROM pg_stat_user_indexes`
- Consider partitioning large tables if they grow beyond 10GB

### RLS Policy Errors

- Verify authentication is configured correctly
- Check policy logic with `SELECT current_user_id()`
- Test policies with SQL queries before implementing

## Next Steps

1. **Phase 2**: Implement proper authentication and authorization
2. **Phase 3**: Add data validation triggers
3. **Phase 4**: Implement audit logging
4. **Phase 5**: Set up performance monitoring and alerting

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [Row-Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)
