# Collaboration Feature - Bug Fix List

## Priority: High

### 1. Memory Leak - Cursor Targets Never Cleaned
**Location:** `cursorTargets.current` (line ~202)

**Problem:** When a user disconnects by closing their browser (without explicit 'leave' event), their cursor target remains in `cursorTargets.current` forever, causing memory leak and phantom data.

**Current behavior:**
```javascript
// Only cleaned on explicit 'leave' broadcast
.on('broadcast', { event: 'leave' }, ({ payload }) => {
  delete cursorTargets.current[payload.username]; // Never called if browser closes
})
```

**Fix:** Add periodic cleanup (every 30s) that removes targets not updated recently. Add timestamp to each target.

---

### 2. Stale Cursors - No Timeout
**Location:** `remoteCursors` state, cursor rendering (line ~3225)

**Problem:** If a user disconnects without sending 'leave', their cursor remains visible indefinitely on other users' screens.

**Fix:**
- Add `lastSeen` timestamp to each cursor
- Run cleanup interval that removes cursors not updated in 5+ seconds
- Show "away" state for cursors idle 2+ seconds

---

### 3. No Reconnection Handling
**Location:** `enableCollaboration()` (line ~782)

**Problem:** If WebSocket disconnects mid-session (network issue, Supabase hiccup), the user has no way to recover. They must manually disable and re-enable collaboration.

**Current behavior:** Channel status changes to 'CLOSED' but nothing happens.

**Fix:**
- Listen for 'CLOSED' and 'CHANNEL_ERROR' status
- Implement exponential backoff reconnection
- Show "Reconnecting..." UI state
- Preserve local changes during reconnection

---

## Priority: Medium

### 4. Limited User Colors
**Location:** `userColors` object (line ~222)

**Problem:** Only 'kitten' and 'slime' have defined colors. Any other username gets white (`#FFFFFF`), which is invisible on light backgrounds.

**Current code:**
```javascript
const userColors = {
  'kitten': '#FF6B6B',
  'slime': '#4ECDC4'
};
// Other users: window.__userColor || '#FFFFFF'
```

**Fix:** Generate deterministic color from username hash:
```javascript
const getUserColor = (username) => {
  const hash = username.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};
```

---

### 5. Groups Not Synced in Real-Time
**Location:** Element drag handler (line ~2260)

**Problem:** When dragging elements, only individual element positions are broadcast. Group movements (which move multiple elements) don't broadcast each child element's position.

**Current code only handles:**
```javascript
selectedElements.forEach(elId => {
  const el = newElements.find(e => e.id === elId);
  // Groups contain nested elements that aren't broadcast
});
```

**Fix:** When a group is dragged, also broadcast all elements within the group.

---

### 6. Element Deletion Not Synced to Targets
**Location:** `elementTargets.current` (line ~210)

**Problem:** When user A deletes an element that user B is watching (has in `elementTargets`), user B's `elementTargets` still contains the deleted element's target, causing potential errors.

**Fix:**
- Broadcast 'element-deleted' event
- Listen and clean up `elementTargets.current[deletedId]`

---

### 7. Race Condition with Username Globals
**Location:** `window.__currentUsername` (line ~800)

**Problem:** Username is set to `window.__currentUsername` when collaboration starts. If user somehow changes during session (logout/login), the global becomes stale.

**Current code:**
```javascript
window.__currentUsername = currentUser.username;
window.__userColor = userColors[currentUser.username] || '#FFFFFF';
```

**Fix:** Use refs instead of window globals, or update globals when `currentUser` changes.

---

## Priority: Low

### 8. Drawing Not Real-Time
**Location:** Draw tool handler

**Problem:** Freehand drawing only syncs when the stroke is complete (mouse up). Other users don't see the drawing in progress.

**Current behavior:**
- User A draws a line
- Line appears in User B's view only after User A releases mouse

**Fix:** Broadcast drawing path points in real-time (throttled), similar to cursor positions. Show "ghost" strokes for in-progress drawings.

---

### 9. No Conflict Resolution UI
**Location:** Board sync (line ~1112)

**Problem:** When two users edit the same element simultaneously, last-write-wins silently. No indication that changes were overwritten.

**Fix:**
- Detect conflicting edits (same element, different users, within 2s)
- Show toast notification: "Your changes to [element] were overwritten by [username]"
- Optional: element-level locking while editing

---

### 10. Chat Messages Not Persisted on Reconnect
**Location:** `enableCollaboration()` chat loading (line ~896)

**Problem:** Chat history is loaded once on collaboration start. If user reconnects, they see duplicate messages or miss messages sent during disconnect.

**Fix:**
- Track last message timestamp
- On reconnect, only fetch messages after last seen timestamp
- Deduplicate by message ID

---

## Technical Debt

### 11. Animation Loops Always Running
**Location:** Cursor/element interpolation useEffects (lines ~235, ~284)

**Problem:** `requestAnimationFrame` loops run continuously when in collaboration mode, even if no cursors or elements are being interpolated.

**Fix:** Only start animation loop when there are active targets, stop when empty.

---

### 12. No TypeScript Types
**Problem:** All collaboration state uses `any` implicitly. Makes refactoring risky.

**Fix:** Add TypeScript interfaces:
```typescript
interface CursorTarget {
  x: number;
  y: number;
  color: string;
  lastSeen: number;
}

interface ElementTarget {
  x: number;
  y: number;
  lastSeen: number;
}
```

---

## Testing Checklist

- [ ] Two users can see each other's cursors
- [ ] Cursor movement is smooth (60fps interpolation)
- [ ] Element drag syncs in real-time
- [ ] User disconnect removes their cursor within 5s
- [ ] Reconnection after network drop works
- [ ] 3+ users can collaborate simultaneously
- [ ] Chat messages sync correctly
- [ ] Comments on elements sync
- [ ] No console warnings about REST fallback
- [ ] No memory leaks after 30min session
