# Real-Time Collaboration - Code Analysis

## Executive Summary
The collaboration infrastructure is ~70% built but disabled. The main components exist; we need to verify the backend schema, fix sync logic, and add presence visualization.

---

## Current Implementation Status

### ✅ What Works
1. **Supabase Client Integration** (ProjectPlanningBoard.jsx, lines 8-12)
   ```javascript
   const SUPABASE_URL = 'https://wdxeucdxzwerqkdicwgq.supabase.co';
   const SUPABASE_ANON_KEY = '[JWT token]';
   const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   ```

2. **State Variables Ready** (lines 193-199)
   ```javascript
   const [collaborationMode, setCollaborationMode] = useState(false);
   const [collaborationBoardId, setCollaborationBoardId] = useState(null);
   const [remoteUsers, setRemoteUsers] = useState([]);
   const [deletedIds, setDeletedIds] = useState(new Set());
   const realtimeChannel = useRef(null);
   ```

3. **Auto-save with Debouncing** (lines 743-752)
   ```javascript
   useEffect(() => {
     if (!collaborationMode) return;
     const saveTimeout = setTimeout(() => {
       saveToSharedBoard();
     }, 1000); // 1-second debounce
     return () => clearTimeout(saveTimeout);
   }, [elements, groups, collaborationMode]);
   ```

4. **User Authentication**
   - Hardcoded users: kitten (password: dean), slime (password: dean)
   - localStorage session persistence
   - User object structure: { username, name }

### ❌ What's Broken/Disabled
1. **Collaboration Button** (line 2351)
   ```javascript
   {false && ( // Hidden for now
     <button onClick={enableCollaboration}>Collaborate</button>
   )}
   ```

2. **Missing Database Schema**
   - Code expects `supabase.from('boards')` table
   - No confirmation this table exists
   - RLS policies unknown

3. **No Presence Tracking Implementation**
   - `remoteUsers` state exists but never populated
   - No presence channel listening
   - No cursor position tracking

### 🔧 What Needs Building

#### 1. Backend (Supabase)
- [ ] Verify or create `boards` table schema:
  ```sql
  CREATE TABLE boards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- [ ] Create `presence` table:
  ```sql
  CREATE TABLE presence (
    id UUID PRIMARY KEY,
    board_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    cursor_x FLOAT,
    cursor_y FLOAT,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- [ ] RLS Policies for authenticated users
  - Users can read all boards
  - Users can write to shared boards
  - Users can insert/update own presence

#### 2. Frontend - Phase 1: Sync & Button
- [ ] Uncomment collaboration button (line 2351)
- [ ] Fix `enableCollaboration()` (lines 672-715)
  - Currently uses `window.supabase` (client from CDN)
  - Should use imported `supabase` client
  - Add error handling and user feedback

- [ ] Fix `saveToSharedBoard()` (lines 718-741)
  - Add retry logic on failure
  - Add conflict detection (timestamp/version)
  - Handle upsert conflicts gracefully

#### 3. Frontend - Phase 2: Presence
- [ ] Implement cursor tracking
  ```javascript
  const handleMouseMove = (e) => {
    // ... existing code ...
    // Add: broadcast cursor position to presence channel
    channel?.send({
      type: 'broadcast',
      event: 'cursor',
      payload: { x: mouseX, y: mouseY, userId: currentUser.username }
    });
  };
  ```

- [ ] Render remote cursors
  ```javascript
  remoteUsers.forEach(user => (
    <Cursor key={user.id} x={user.cursor_x} y={user.cursor_y} label={user.name} />
  ));
  ```

- [ ] Presence heartbeat & cleanup
  - Send heartbeat every 5 seconds
  - Clean up stale presence after 30 seconds

---

## Code Locations

| Feature | File | Lines | Status |
|---------|------|-------|--------|
| Supabase Init | ProjectPlanningBoard.jsx | 8-12 | ✅ |
| User Auth | ProjectPlanningBoard.jsx | 14-86 | ✅ |
| Collaboration State | ProjectPlanningBoard.jsx | 193-199 | ✅ |
| enableCollaboration() | ProjectPlanningBoard.jsx | 672-715 | ❌ Disabled |
| saveToSharedBoard() | ProjectPlanningBoard.jsx | 718-741 | ⚠️ Needs fixes |
| Auto-save Effect | ProjectPlanningBoard.jsx | 743-752 | ✅ |
| Real-time Load | ProjectPlanningBoard.jsx | 895-1037 | ⚠️ Needs review |
| Collab Button UI | ProjectPlanningBoard.jsx | 2351-2363 | ❌ Disabled |

---

## Sync Flow Diagram

```
User A (kitten)          Supabase              User B (slime)
     |                      |                        |
     | Edit element         |                        |
     | 1000ms debounce      |                        |
     | saveToSharedBoard()  |                        |
     |------ upsert ------->|                        |
     |                      | postgres_changes      |
     |                      |---- broadcast ------->|
     |                      | (remoteUpdate)        |
     |                      | setElements()         |
     |                      |                        |
     |<---- receive --------|                        |
     | remoteUpdate event   |                        |
     | Update local state   |                        |
```

---

## Success Criteria Validation

### Criterion 1: Two users can edit simultaneously
**Implementation Path**:
1. enableCollaboration() works with shared board ID
2. saveToSharedBoard() sends changes to Supabase
3. postgres_changes listener receives updates on both clients

**Test Scenario**:
- User A creates element
- User B sees it within 2 seconds
- User A edits element
- User B sees change in real-time

### Criterion 2: <1 second latency
**Implementation Path**:
1. 1000ms debounce acceptable (already implemented)
2. Supabase realtime <500ms typical
3. Total time: ~1-2 seconds per change

**Optimization**:
- Reduce debounce to 500ms for faster response
- Implement partial updates (not full doc)

### Criterion 3: Users see each other's cursors
**Implementation Path**:
1. Broadcast channel for cursor events
2. Presence table for persistent tracking
3. Render remote cursors with user labels

**Test Scenario**:
- User A moves cursor
- User B sees cursor label + position
- Update happens in real-time

### Criterion 4: No data loss on concurrent edits
**Implementation Path**:
1. Timestamp-based conflict detection
2. Version numbering on updates
3. Merge strategy (last-write-wins acceptable for MVP)

**Test Scenario**:
- User A and B edit same element simultaneously
- Changes don't overwrite each other
- Both modifications visible (or explicit merge)

---

## Implementation Priority

1. **CRITICAL**: Verify Supabase schema exists
2. **HIGH**: Enable button & fix basic sync
3. **HIGH**: Add conflict detection
4. **MEDIUM**: Implement presence tracking
5. **MEDIUM**: Cursor visualization
6. **LOW**: Optimize for scale

---

## Common Pitfalls to Avoid

1. **Using window.supabase instead of imported client**
   - Current code has both - clarify which to use
   - Imported client is correct (line 12)

2. **Infinite loop on remote updates**
   - `isRemoteUpdate` flag exists but not fully used
   - Must prevent re-broadcasting own updates

3. **State sync timing**
   - Don't immediately apply remote updates to UI state
   - Let realtime listener update state, not dependent code

4. **Presence cleanup**
   - Users leaving without cleanup creates stale cursors
   - Implement heartbeat check on backend

5. **Passwords in client code**
   - Line 66 has hardcoded passwords
   - OK for dev/demo, needs backend auth for production

---

## Files to Modify

1. **C:\Users\timot\Desktop\dean-2\app\ProjectPlanningBoard.jsx**
   - Main file with all collaboration code
   - Lines to focus: 2351, 672-715, 718-741, 895-1037

2. **Database Setup** (Supabase Console)
   - Create tables and RLS policies
   - Can be done via SQL or UI

3. **No new files needed** for MVP (unless extracting components)

---

## Testing Checklist

- [ ] Two browser windows/tabs open
- [ ] Log in as kitten in tab 1, slime in tab 2
- [ ] Click "Collaborate" button (once enabled)
- [ ] Enter same board ID in both
- [ ] Draw element in tab 1
- [ ] Verify appears in tab 2 within 2 seconds
- [ ] Edit element in tab 2
- [ ] Verify change appears in tab 1
- [ ] Move cursor in tab 1
- [ ] Verify cursor visible in tab 2
- [ ] Refresh tab 2, verify data persists
- [ ] Verify no console errors

---

## Questions for Team

1. Has the `boards` table been created in Supabase?
2. Are RLS policies configured?
3. What's the acceptable latency for changes? (MVP = 1-2 seconds)
4. Should presence be persistent (DB) or ephemeral (broadcast only)?
5. For conflict resolution: last-write-wins or merge strategy?
