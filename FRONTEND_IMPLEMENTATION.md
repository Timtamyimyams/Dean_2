# Frontend Implementation Plan - Phase 2-5

## Overview
This document outlines the exact changes needed to ProjectPlanningBoard.jsx to implement real-time collaboration.

## Phase 2: Document Sync Implementation

### Changes Required

#### 1. Line 2351: Uncomment Collaboration Button
Remove the `{false && (` wrapper

#### 2. Lines 672-715: Fix enableCollaboration() Function
Replace function to use imported supabase, add error handling, setup realtime listeners

#### 3. Lines 718-741: Fix saveToSharedBoard() Function
Replace function to add retry logic, proper error handling, conflict detection

#### 4. Add Cursor State Variables (around line 196)
```javascript
const [remoteCursors, setRemoteCursors] = useState({});
```

#### 5. Add Chat State Variables (around line 196)
```javascript
const [showChat, setShowChat] = useState(false);
const [chatMessages, setChatMessages] = useState([]);
const [chatInput, setChatInput] = useState('');
```

#### 6. Add Comments State Variables (around line 196)
```javascript
const [elementComments, setElementComments] = useState({});
const [showCommentPanel, setShowCommentPanel] = useState(null);
const [commentInput, setCommentInput] = useState('');
```

## Implementation Order
1. Start with Phase 2 (sync) - CRITICAL
2. Then Phase 3 (cursors)
3. Then Phase 4 (chat)
4. Then Phase 5 (comments)

Each phase builds on previous work.

