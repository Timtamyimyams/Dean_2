# Devlog - Real-Time Collaboration Feature

## Project
- **Name:** DEAN Planning Board - Real-Time Collaboration
- **Goal:** Enable full real-time collaboration (document sync, live cursors, chat, comments) for 2-5 concurrent users
- **Start Date:** 2025-12-30
- **Status:** Active

---

## Team Members
- **PM** (You) – Coordination & Documentation
- **Backend Developer** – Database schema, Supabase RLS policies
- **Frontend Developer** – UI/React implementation, real-time listeners

---

## Project Overview

### Current State
- 70% of collaboration infrastructure already built but DISABLED
- Location: C:\Users\timot\Desktop\dean-2\app\ProjectPlanningBoard.jsx (2961 lines)
- Supabase client already initialized and configured
- Collaboration state variables exist but not wired up
- Collaboration button hidden with `{false && ...}` on line 2351

### Tech Stack
- Next.js 16, React 19
- Supabase (PostgREST + Realtime)
- Conflict Resolution: Last-write-wins acceptable
- Scale: 2-5 concurrent users per board

---

## Implementation Phases

### Phase 1: Database & Infrastructure Setup
- [ ] Create/verify `boards` table schema in Supabase
- [ ] Create `presence` table for cursor tracking
- [ ] Create `messages` table for chat
- [ ] Create `comments` table for element comments
- [ ] Configure RLS policies for secure access

### Phase 2: Enable Document Sync
- [ ] Fix `enableCollaboration()` function (lines 672-715)
- [ ] Fix `saveToSharedBoard()` function (lines 718-741)
- [ ] Uncomment collaboration button (line 2351)
- [ ] Test: two users can edit simultaneously and see changes

### Phase 3: Implement Live Cursors
- [ ] Track cursor position on mousemove
- [ ] Broadcast cursor updates via Supabase Realtime
- [ ] Render remote user cursors with labels
- [ ] Implement cursor cleanup on disconnect

### Phase 4: Chat Functionality
- [ ] Add chat UI component to canvas
- [ ] Implement real-time message broadcast
- [ ] Add message history loading
- [ ] Test message delivery

### Phase 5: Comments on Elements
- [ ] Add comment UI (popup/modal)
- [ ] Implement comment persistence
- [ ] Add comment threading/replies
- [ ] Add comment notifications

---

## Task Log

### 2025-12-30 - PM Analysis & Planning
**Task:** Analyze existing codebase and create project plan
**Assigned to:** PM (Self)
**Status:** Completed
**Notes:**
- Reviewed COLLABORATION_ANALYSIS.md (289 lines)
- Reviewed ProjectPlanningBoard.jsx (2961 lines)
- Identified core infrastructure already in place:
  - Supabase client configured
  - Collaboration state variables defined
  - saveToSharedBoard() and enableCollaboration() functions exist
  - Auto-save effect with 1000ms debounce
- Decomposed work into 5 phases across 2 team members
- Project plan established in devlog

---

## Architecture Overview

### Supabase Realtime Flow
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
     |<---- receive --------|                        |
     | remoteUpdate event   |                        |
     | Update local state   |                        |
```

---

## Database Schema (Phase 1)

### Tables to Create

1. **boards** (verify/create):
   ```sql
   CREATE TABLE IF NOT EXISTS public.boards (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     data JSONB NOT NULL,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

2. **presence**:
   ```sql
   CREATE TABLE IF NOT EXISTS public.presence (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     board_id TEXT NOT NULL REFERENCES public.boards(id),
     user_id TEXT NOT NULL,
     username TEXT NOT NULL,
     cursor_x FLOAT NOT NULL,
     cursor_y FLOAT NOT NULL,
     last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

3. **messages**:
   ```sql
   CREATE TABLE IF NOT EXISTS public.messages (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     board_id TEXT NOT NULL REFERENCES public.boards(id),
     user_id TEXT NOT NULL,
     username TEXT NOT NULL,
     content TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

4. **comments**:
   ```sql
   CREATE TABLE IF NOT EXISTS public.comments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     board_id TEXT NOT NULL REFERENCES public.boards(id),
     element_id TEXT NOT NULL,
     user_id TEXT NOT NULL,
     username TEXT NOT NULL,
     content TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

---

## Frontend Implementation (Phase 2+)

### Key Code Locations in ProjectPlanningBoard.jsx

| Feature | Line # | Status |
|---------|--------|--------|
| Supabase Init | 8-12 | OK |
| Collab State | 193-199 | OK - Need to wire up |
| enableCollaboration() | 672-715 | Needs fixing |
| saveToSharedBoard() | 718-741 | Needs fixing |
| Auto-save Effect | 743-752 | OK |
| Collab Button | 2351 | Disabled - Uncomment |

---

## Key Decisions

1. **Last-write-wins:** Simple conflict resolution - acceptable for MVP
2. **Debounce:** 1000ms on saves - balances responsiveness vs. DB load
3. **Realtime:** Use postgres_changes for reliable sync
4. **Broadcast:** Use for ephemeral cursor positions (no DB storage)
5. **Auth:** Hardcoded users OK for MVP (kitten, slime)

---

## Dependencies & Blockers

### None Currently Identified
- Supabase project accessible and configured
- All dependencies installed
- No external APIs needed for MVP

---

## Success Criteria

1. **Two users can edit simultaneously**
   - User A creates element -> User B sees it within 2 seconds
   - User B edits element -> User A sees change in real-time

2. **Live cursors visible**
   - User A moves cursor -> User B sees cursor with label
   - Position updates in real-time

3. **Chat working**
   - User A sends message -> User B receives instantly
   - Message history persists after refresh

4. **Comments functional**
   - User A adds comment to element
   - User B sees comment immediately
   - Comments persist in database

5. **No data loss**
   - Concurrent edits don't overwrite each other
   - All changes visible with last-write-wins resolution

---

## Files Modified / Created

### Phase 1 Ready (Awaiting Backend Developer)
- **Documentation:** PHASE_1_BACKEND_BRIEFING.md (Complete task specification)
- **Deliverables:** 4 Supabase tables + RLS policies (to be created)

### Phases 2-5 Ready (Awaiting Phase 1 Completion, then Frontend Developer)
- **Primary File:** app/ProjectPlanningBoard.jsx (all changes here)
- **Estimated Changes:** ~500-800 lines of code additions
- **Documentation:** devlog.md (this file - track progress here)

---

## Team Communication & Status

### Backend Developer - TODO
- [ ] Read PHASE_1_BACKEND_BRIEFING.md for detailed task specs
- [ ] Access Supabase project at https://wdxeucdxzwerqkdicwgq.supabase.co
- [ ] Create 4 tables (boards, presence, messages, comments)
- [ ] Configure RLS policies (allow read-all, write-own for presence/comments)
- [ ] Enable realtime replication on all tables
- [ ] Test with SQL queries to verify functionality
- [ ] Provide completion confirmation in devlog with test results
- [ ] Estimated time: 45-60 minutes

### Frontend Developer - TODO (Starts After Phase 1)
1. **Phase 2: Document Sync** (90-120 minutes)
   - Fix enableCollaboration() to use imported supabase
   - Fix saveToSharedBoard() with retry logic
   - Add realtime listeners for boards, messages, comments
   - Uncomment collaboration button
   - Test: two users sync in real-time

2. **Phase 3: Cursors** (60-90 minutes)
   - Add cursor broadcast on mousemove
   - Add remoteCursors state and rendering
   - Test: cursor follows with <500ms latency

3. **Phase 4: Chat** (60-90 minutes)
   - Add chat UI panel (collapse-able)
   - Implement send/receive messages
   - Load chat history on connect
   - Test: messages deliver instantly

4. **Phase 5: Comments** (90-120 minutes)
   - Add comment panel per element
   - Implement comment threads
   - Load/persist comments
   - Test: comments sync in real-time

---

## Next Steps

**IMMEDIATE (Now):**
1. Backend Developer: Start Phase 1
   - Create Supabase tables
   - Configure RLS
   - Validate with test data

2. Frontend Developer: Wait for Phase 1 completion
   - Review COLLABORATION_ANALYSIS.md for context
   - Prepare local development environment
   - Review ProjectPlanningBoard.jsx structure

**AFTER Phase 1 Complete:**
1. Frontend Developer: Begin Phase 2
2. PM: Monitor progress in devlog
3. Run acceptance tests after each phase

**SUCCESS = All phases complete with working end-to-end collaboration**

---

## Notes for Implementation

### Code Structure
- All changes in single file: `app/ProjectPlanningBoard.jsx`
- Add state variables around line 196
- Add functions around line 870 (after saveToSharedBoard)
- Add UI rendering around line 3030 (before help modal)
- Modify mousemove handler around line 1929

### State Variables Needed
```javascript
// Cursor tracking
const [remoteCursors, setRemoteCursors] = useState({});
const lastCursorPos = useRef({ x: 0, y: 0 });

// Chat
const [showChat, setShowChat] = useState(false);
const [chatMessages, setChatMessages] = useState([]);
const [chatInput, setChatInput] = useState('');

// Comments
const [elementComments, setElementComments] = useState({});
const [showCommentPanel, setShowCommentPanel] = useState(null);
const [commentInput, setCommentInput] = useState('');
```

### Critical Implementation Points
1. Use imported `supabase` client, NOT `window.supabase`
2. Prevent sync loops with `isRemoteUpdate.current` flag
3. Debounce cursor broadcast to 5px threshold
4. Order messages/comments by created_at for consistency
5. Test with two browser tabs as different users

### Testing Checklist
```
PHASE 2 (Sync):
- [ ] Collaborate button visible
- [ ] Two users same board
- [ ] A creates, B sees <2s
- [ ] B edits, A sees <2s
- [ ] Data persists refresh

PHASE 3 (Cursors):
- [ ] Remote cursor visible
- [ ] User label shows
- [ ] Smooth tracking
- [ ] Accurate at all zooms

PHASE 4 (Chat):
- [ ] Panel opens/closes
- [ ] Message delivery <500ms
- [ ] History loads
- [ ] Persists refresh

PHASE 5 (Comments):
- [ ] Comment panel works
- [ ] Threads correctly
- [ ] Persists refresh
```

---

## Risk Mitigation

**Sync Loop Risk:** Use `isRemoteUpdate` flag - CRITICAL
**Data Loss Risk:** Test concurrent edits carefully
**Cursor Drift Risk:** Account for zoom/scroll in positioning
**Performance Risk:** Don't render all cursors if >10 users (future)

---

## Deployment Readiness

Once all phases complete:
1. All acceptance tests pass
2. No console errors
3. Code committed with clear message
4. Documentation updated
5. Ready for production deployment

Current Status: **PLANNING PHASE COMPLETE - AWAITING TEAM EXECUTION**

---

Last Updated: 2025-12-30 14:30 PM
Status: READY FOR TEAM HANDOFF

