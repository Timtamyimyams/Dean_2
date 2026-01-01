import React, { useState, useRef, useEffect } from 'react';
import { Trash2, LogOut } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { toolDefinitions, tools } from './tools';

export default function ProjectPlanningBoard() {
  // Supabase configuration
  const SUPABASE_URL = 'https://wdxeucdxzwerqkdicwgq.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkeGV1Y2R4endlcnFrZGljd2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Njc0ODUsImV4cCI6MjA4MTA0MzQ4NX0.0KpU4ehry7mSo5DkMz6iL-N34XxlNmz8-X-m16Gz308';
  
  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('planningboard_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        // Validate that user has required fields and is a valid account
        const validUsers = ['kitten', 'slime'];
        if (user && user.username && validUsers.includes(user.username.toLowerCase())) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('planningboard_user');
        }
      } catch (e) {
        localStorage.removeItem('planningboard_user');
      }
    }
  }, []);
  
  // Simple hash function for passwords (in production, use proper backend auth)
  const hashPassword = (password) => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  };
  
  // Handle login
  const handleLogin = (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    
    const formData = new FormData(e.target);
    const username = formData.get('email').toLowerCase().trim();
    const password = formData.get('password');
    
    // Hardcoded accounts
    const hardcodedUsers = {
      'kitten': { password: 'dean', name: 'Kitten' },
      'slime': { password: 'dean', name: 'Slime' }
    };
    
    setTimeout(() => {
      if (hardcodedUsers[username] && hardcodedUsers[username].password === password) {
        const user = { username, name: hardcodedUsers[username].name };
        setCurrentUser(user);
        setIsAuthenticated(true);
        localStorage.setItem('planningboard_user', JSON.stringify(user));
        setAuthLoading(false);
      } else {
        setAuthError('Invalid username or password');
        setAuthLoading(false);
      }
    }, 500);
  };
  
  // Handle signup
  const handleSignup = (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      setAuthLoading(false);
      return;
    }
    
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      setAuthLoading(false);
      return;
    }
    
    // Get existing users
    const users = JSON.parse(localStorage.getItem('planningboard_users') || '{}');
    
    if (users[email]) {
      setAuthError('An account with this email already exists');
      setAuthLoading(false);
      return;
    }
    
    setTimeout(() => {
      // Save new user
      users[email] = {
        name,
        password: hashPassword(password),
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('planningboard_users', JSON.stringify(users));
      
      // Auto login
      const user = { email, name };
      setCurrentUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('planningboard_user', JSON.stringify(user));
      setAuthLoading(false);
    }, 500);
  };
  
  // Handle logout
  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('planningboard_user');
  };
  
  const [elements, setElements] = useState([]);
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedElements, setSelectedElements] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [editingText, setEditingText] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [textSelection, setTextSelection] = useState({ start: 0, end: 0 });
  const [selectionBox, setSelectionBox] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [dragOffsets, setDragOffsets] = useState({});
  const [isExternalDrop, setIsExternalDrop] = useState(false);
  const [resizingElement, setResizingElement] = useState(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [eraseBox, setEraseBox] = useState(null);
  const [isErasing, setIsErasing] = useState(false);
  const [eraseStart, setEraseStart] = useState(null);
  const [groups, setGroups] = useState([]);
  const canvasRef = useRef(null);
  const textInputRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [currentBoardName, setCurrentBoardName] = useState('untitled-board');
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [clipboard, setClipboard] = useState({ elements: [], groups: [] });
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedo, setIsUndoRedo] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isFitMode, setIsFitMode] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const [scaleStart, setScaleStart] = useState(null);
  const [scaleOrigin, setScaleOrigin] = useState(null);
  const [originalElementStates, setOriginalElementStates] = useState([]);
  const [lastCanvasClick, setLastCanvasClick] = useState(0);
  const [clickTimeout, setClickTimeout] = useState(null);
  const [justFinishedSelecting, setJustFinishedSelecting] = useState(false);
  const [justFinishedTextEdit, setJustFinishedTextEdit] = useState(false);
  const [showHelp, setShowHelp] = useState(true); // Show on first load
  const [collaborationMode, setCollaborationMode] = useState(false);
  const [collaborationBoardId, setCollaborationBoardId] = useState(null);
  const [lastRemoteUpdate, setLastRemoteUpdate] = useState(0);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [deletedIds, setDeletedIds] = useState(new Set()); // Tombstones for deleted elements
  const isRemoteUpdate = useRef(false);
  const realtimeChannel = useRef(null);
  const lastSavedRef = useRef(null);
  const elementsRef = useRef([]);
  const groupsRef = useRef([]);
  const deletedIdsRef = useRef(new Set());

  // Collaboration: Cursor presence state
  const [remoteCursors, setRemoteCursors] = useState({});
  const presenceChannel = useRef(null);
  const localCursorPosition = useRef({ x: 0, y: 0 });

  // Chat panel state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatChannel = useRef(null);
  const commentsChannel = useRef(null);
  const chatContainerRef = useRef(null);

  // Comments state
  const [comments, setComments] = useState({});
  const [activeCommentElement, setActiveCommentElement] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

  // User colors for collaboration
  const userColors = {
    'kitten': '#FF6B6B',
    'slime': '#4ECDC4'
  };

  // Get bounding box of all content
  const getContentBounds = () => {
    if (elements.length === 0 && groups.length === 0) {
      return { x: 0, y: 0, width: 800, height: 600 };
    }
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    elements.forEach(el => {
      if (el.type === 'draw' || el.type === 'line') {
        el.path.forEach(point => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });
      } else {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + (el.width || 100));
        maxY = Math.max(maxY, el.y + (el.height || 100));
      }
    });
    
    groups.forEach(g => {
      minX = Math.min(minX, g.x);
      minY = Math.min(minY, g.y);
      maxX = Math.max(maxX, g.x + g.width);
      maxY = Math.max(maxY, g.y + g.height);
    });
    
    const padding = 200;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    };
  };

  // Calculate dynamic canvas size based on content
  const getCanvasSize = () => {
    const bounds = getContentBounds();
    const padding = 500;
    
    const minSize = 10000;
    
    const neededWidth = Math.max(minSize, (bounds.x + bounds.width + padding));
    const neededHeight = Math.max(minSize, (bounds.y + bounds.height + padding));
    
    const width = Math.max(neededWidth, Math.abs(bounds.x) + padding);
    const height = Math.max(neededHeight, Math.abs(bounds.y) + padding);
    
    return {
      width: Math.ceil(width),
      height: Math.ceil(height)
    };
  };

  const canvasSize = getCanvasSize();

  // Reusable helper: Get world coordinates from mouse event
  const getWorldCoords = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scrollX = canvasRef.current.scrollLeft;
    const scrollY = canvasRef.current.scrollTop;
    const x = (e.clientX - rect.left + scrollX) / zoom;
    const y = (e.clientY - rect.top + scrollY) / zoom;
    
    return { x, y };
  };

  // Reusable helper: Calculate drag box from start point to current point
  const getDragBox = (startPoint, currentPoint) => {
    return {
      x: Math.min(startPoint.x, currentPoint.x),
      y: Math.min(startPoint.y, currentPoint.y),
      width: Math.abs(currentPoint.x - startPoint.x),
      height: Math.abs(currentPoint.y - startPoint.y)
    };
  };

  // Save state to history
  const saveToHistory = () => {
    if (isUndoRedo) return;
    
    const state = {
      elements: elements.map(el => ({ ...el })),
      groups: groups.map(g => ({ ...g, elements: g.elements.map(e => ({ ...e })) }))
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    
    if (newHistory.length > 50) {
      newHistory.shift();
      setHistory(newHistory);
    } else {
      setHistory(newHistory);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Zoom to fit all content (Figma-style instant snap)
  const zoomToFit = () => {
    if (!canvasRef.current) return;
    
    const bounds = getContentBounds();
    const rect = canvasRef.current.getBoundingClientRect();
    
    const zoomX = rect.width / bounds.width;
    const zoomY = rect.height / bounds.height;
    const newZoom = Math.min(zoomX, zoomY, 1);
    
    // Calculate scroll position
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const scrollLeft = centerX * newZoom - rect.width / 2;
    const scrollTop = centerY * newZoom - rect.height / 2;
    
    // Instant snap - scroll before zoom (no delay)
    canvasRef.current.scrollLeft = scrollLeft;
    canvasRef.current.scrollTop = scrollTop;
    
    setZoom(newZoom);
    setIsFitMode(true);
  };

  // Zoom with mouse position tracking
  const handleZoomChange = (newZoom, mouseX, mouseY, instant = false) => {
    const clampedZoom = Math.max(0.1, Math.min(2, newZoom));
    
    if (isFitMode) {
      setIsFitMode(false);
    }
    
    if (canvasRef.current && mouseX !== undefined && mouseY !== undefined) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scrollX = canvasRef.current.scrollLeft;
      const scrollY = canvasRef.current.scrollTop;
      
      // Calculate world position under mouse before zoom
      const worldXBefore = (mouseX - rect.left + scrollX) / zoom;
      const worldYBefore = (mouseY - rect.top + scrollY) / zoom;
      
      setZoom(clampedZoom);
      
      if (instant) {
        // Instant mode for fit/reset buttons - no delay
        canvasRef.current.scrollLeft = worldXBefore * clampedZoom - (mouseX - rect.left);
        canvasRef.current.scrollTop = worldYBefore * clampedZoom - (mouseY - rect.top);
      } else {
        // Delayed mode for scroll wheel - like old version
        setTimeout(() => {
          if (canvasRef.current) {
            const worldXAfter = worldXBefore * clampedZoom;
            const worldYAfter = worldYBefore * clampedZoom;
            
            canvasRef.current.scrollLeft = worldXAfter - (mouseX - rect.left);
            canvasRef.current.scrollTop = worldYAfter - (mouseY - rect.top);
          }
        }, 0);
      }
    } else {
      setZoom(clampedZoom);
    }
  };

  // Reset view to origin
  const resetView = () => {
    setZoom(1);
    setIsFitMode(false);
    if (canvasRef.current) {
      canvasRef.current.scrollLeft = 0;
      canvasRef.current.scrollTop = 0;
    }
  };

  // Clear all elements from board
  const clearBoard = () => {
    if (elements.length === 0 && groups.length === 0) return;
    
    const confirmed = window.confirm('Clear the entire board? This cannot be undone.');
    if (confirmed) {
      setElements([]);
      setGroups([]);
      setSelectedElements([]);
      saveToHistory();
    }
  };

  // Viewport culling - only render visible elements
  const getVisibleElements = () => {
    if (!canvasRef.current) return { elements, groups };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scrollX = canvasRef.current.scrollLeft;
    const scrollY = canvasRef.current.scrollTop;
    
    const viewport = {
      x: scrollX / zoom,
      y: scrollY / zoom,
      width: rect.width / zoom,
      height: rect.height / zoom
    };
    
    const padding = 500;
    viewport.x -= padding;
    viewport.y -= padding;
    viewport.width += padding * 2;
    viewport.height += padding * 2;
    
    const isInViewport = (el) => {
      if (el.type === 'draw' || el.type === 'line') {
        return el.path.some(p => 
          p.x >= viewport.x && p.x <= viewport.x + viewport.width &&
          p.y >= viewport.y && p.y <= viewport.y + viewport.height
        );
      } else {
        const elRight = el.x + (el.width || 100);
        const elBottom = el.y + (el.height || 100);
        
        return !(el.x > viewport.x + viewport.width ||
                 elRight < viewport.x ||
                 el.y > viewport.y + viewport.height ||
                 elBottom < viewport.y);
      }
    };
    
    const isGroupInViewport = (g) => {
      const gRight = g.x + g.width;
      const gBottom = g.y + g.height;
      
      return !(g.x > viewport.x + viewport.width ||
               gRight < viewport.x ||
               g.y > viewport.y + viewport.height ||
               gBottom < viewport.y);
    };
    
    return {
      elements: elements.filter(isInViewport),
      groups: groups.filter(isGroupInViewport)
    };
  };

  // Check if File System Access API is supported
  const isFileSystemSupported = 'showDirectoryPicker' in window;

  // Undo
  const undo = () => {
    if (historyIndex <= 0) return;
    
    setIsUndoRedo(true);
    const previousState = history[historyIndex - 1];
    setElements(previousState.elements.map(el => ({ ...el })));
    setGroups(previousState.groups.map(g => ({ ...g, elements: g.elements.map(e => ({ ...e })) })));
    setHistoryIndex(historyIndex - 1);
    setSelectedElements([]);
    
    setTimeout(() => setIsUndoRedo(false), 0);
  };

  // Redo
  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    
    setIsUndoRedo(true);
    const nextState = history[historyIndex + 1];
    setElements(nextState.elements.map(el => ({ ...el })));
    setGroups(nextState.groups.map(g => ({ ...g, elements: g.elements.map(e => ({ ...e })) })));
    setHistoryIndex(historyIndex + 1);
    setSelectedElements([]);
    
    setTimeout(() => setIsUndoRedo(false), 0);
  };

  // Request folder access
  const requestFolderAccess = async () => {
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      setDirectoryHandle(handle);
      
      const db = await openDB();
      const tx = db.transaction('settings', 'readwrite');
      await tx.objectStore('settings').put({ id: 'folderGranted', value: true });
      await tx.done;
      
      alert('Folder access granted! Your boards will auto-save here.');
      return handle;
    } catch (err) {
      console.log('User cancelled folder selection');
      return null;
    }
  };

  // Save board to file system
  const saveToFileSystem = async () => {
    if (!directoryHandle) {
      await requestFolderAccess();
      return;
    }

    try {
      setIsSaving(true);
      const boardData = {
        name: currentBoardName,
        elements,
        groups,
        zoom,
        savedAt: new Date().toISOString()
      };

      const fileName = `${currentBoardName}.json`;
      const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(boardData, null, 2));
      await writable.close();

      setLastSaved(new Date());
      setTimeout(() => setIsSaving(false), 500);
    } catch (err) {
      console.error('Error saving:', err);
      setIsSaving(false);
      
      if (err.name === 'NotAllowedError') {
        setDirectoryHandle(null);
        alert('Permission denied. Please grant folder access again.');
      }
    }
  };

  // Load board from file system
  const loadFromFileSystem = async () => {
    if (!directoryHandle) {
      const handle = await requestFolderAccess();
      if (!handle) return;
    }

    try {
      const fileName = window.prompt('Enter board name to load:', currentBoardName);
      if (!fileName) return;

      const fileHandle = await directoryHandle.getFileHandle(`${fileName}.json`);
      const file = await fileHandle.getFile();
      const text = await file.text();
      const boardData = JSON.parse(text);

      setElements(boardData.elements || []);
      setGroups(boardData.groups || []);
      setZoom(boardData.zoom || 1);
      setCurrentBoardName(fileName);
      setLastSaved(new Date(boardData.savedAt));
      
      alert(`Loaded: ${fileName}`);
    } catch (err) {
      console.error('Error loading:', err);
      alert('Board not found or error loading file');
    }
  };

  // List all boards in directory
  const listBoards = async () => {
    if (!directoryHandle) {
      await requestFolderAccess();
      return;
    }

    try {
      const boards = [];
      for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          boards.push(entry.name.replace('.json', ''));
        }
      }
      
      if (boards.length === 0) {
        alert('No saved boards found in this folder.');
        return;
      }

      const boardList = boards.join('\n');
      alert(`Saved boards:\n\n${boardList}\n\nUse "Load Board" to open one.`);
    } catch (err) {
      console.error('Error listing boards:', err);
    }
  };

  // Export as downloadable file (fallback)
  const exportBoard = () => {
    const boardData = {
      name: currentBoardName,
      elements,
      groups,
      zoom,
      savedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(boardData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentBoardName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import from file (fallback)
  const importBoard = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const boardData = JSON.parse(text);

        setElements(boardData.elements || []);
        setGroups(boardData.groups || []);
        setZoom(boardData.zoom || 1);
        setCurrentBoardName(boardData.name || 'imported-board');
        setLastSaved(new Date(boardData.savedAt));
        
        alert('Board imported successfully!');
      } catch (err) {
        console.error('Error importing:', err);
        alert('Error importing board. Invalid file format.');
      }
    };
    input.click();
  };

  // IndexedDB helper for fallback storage
  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PlanningBoardDB', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('boards')) {
          db.createObjectStore('boards', { keyPath: 'name' });
        }
      };
    });
  };

  // Supabase: Initialize client
  const getSupabaseClient = () => {
    if (!window.supabase) {
      console.error('Supabase not loaded. Add <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
      return null;
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  };

  // Collaboration: Enable shared board with Supabase
  const enableCollaboration = async () => {
    if (!currentUser) {
      alert('Please login first to collaborate.');
      return;
    }

    // If already in collaboration mode, disable it
    if (collaborationMode) {
      disableCollaboration();
      return;
    }

    const boardId = window.prompt('Enter board ID to collaborate on:', 'shared-board');
    if (!boardId) return;

    setCollaborationMode(true);
    setCollaborationBoardId(boardId);
    setChatOpen(true);

    // Set globals for cursor tracking (used by throttled function)
    window.__currentUsername = currentUser.username;
    window.__userColor = userColors[currentUser.username] || '#FFFFFF';

    // Subscribe to real-time board changes
    const boardChannel = supabase
      .channel(`board:${boardId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'boards', filter: `id=eq.${boardId}` },
        (payload) => {
          if (payload.new) {
            // Use isRemoteUpdate flag to prevent infinite sync loops
            isRemoteUpdate.current = true;
            setElements(payload.new.elements || []);
            setGroups(payload.new.groups || []);
            setTimeout(() => { isRemoteUpdate.current = false; }, 100);
          }
        }
      )
      .subscribe((status) => {
        console.log('Board channel status:', status);
      });

    realtimeChannel.current = boardChannel;

    // Subscribe to broadcast for cursor tracking (faster than presence - no persistence)
    const cursorChannel = supabase.channel(`cursors:${boardId}`);

    cursorChannel
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (payload.username !== currentUser.username) {
          setRemoteCursors(prev => ({
            ...prev,
            [payload.username]: {
              x: payload.x,
              y: payload.y,
              color: payload.color
            }
          }));
          // Track active users
          setRemoteUsers(prev => [...new Set([...prev, payload.username])]);
        }
      })
      .on('broadcast', { event: 'leave' }, ({ payload }) => {
        setRemoteUsers(prev => prev.filter(u => u !== payload.username));
        setRemoteCursors(prev => {
          const newCursors = { ...prev };
          delete newCursors[payload.username];
          return newCursors;
        });
      })
      .subscribe((status) => {
        console.log('Cursor channel status:', status);
      });

    presenceChannel.current = cursorChannel;

    // Subscribe to chat messages
    const msgChannel = supabase
      .channel(`chat:${boardId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `board_id=eq.${boardId}` },
        (payload) => {
          if (payload.new) {
            setMessages(prev => [...prev, payload.new]);
          }
        }
      )
      .subscribe();

    chatChannel.current = msgChannel;

    // Load initial board data
    const { data } = await supabase
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .single();

    if (data) {
      isRemoteUpdate.current = true;
      setElements(data.elements || []);
      setGroups(data.groups || []);
      setZoom(data.viewport?.zoom || 1);
      setTimeout(() => { isRemoteUpdate.current = false; }, 100);
    }

    // Load existing chat messages
    const { data: msgData } = await supabase
      .from('messages')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (msgData) {
      setMessages(msgData);
    }

    // Subscribe to comments updates
    const cmtChannel = supabase
      .channel(`comments:${boardId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `board_id=eq.${boardId}` },
        (payload) => {
          if (payload.new) {
            const newComment = payload.new;
            setComments(prev => ({
              ...prev,
              [newComment.element_id]: [...(prev[newComment.element_id] || []), newComment]
            }));
          }
        }
      )
      .subscribe();

    commentsChannel.current = cmtChannel;

    // Load existing comments
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: true });

    if (commentsData) {
      const commentsMap = {};
      commentsData.forEach(c => {
        if (!commentsMap[c.element_id]) {
          commentsMap[c.element_id] = [];
        }
        commentsMap[c.element_id].push(c);
      });
      setComments(commentsMap);
    }

    alert(`Collaboration enabled! Share this ID: ${boardId}\n\nOther users can join by entering the same ID.`);
  };

  // Disable collaboration mode
  const disableCollaboration = () => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current);
      realtimeChannel.current = null;
    }
    if (presenceChannel.current) {
      supabase.removeChannel(presenceChannel.current);
      presenceChannel.current = null;
    }
    if (chatChannel.current) {
      supabase.removeChannel(chatChannel.current);
      chatChannel.current = null;
    }
    if (commentsChannel.current) {
      supabase.removeChannel(commentsChannel.current);
      commentsChannel.current = null;
    }
    setCollaborationMode(false);
    setCollaborationBoardId(null);
    setRemoteCursors({});
    setRemoteUsers([]);
    setChatOpen(false);
    setMessages([]);
    setComments({});
  };

  // Ref to track collaboration mode for cursor updates
  const collaborationModeRef = useRef(collaborationMode);
  useEffect(() => {
    collaborationModeRef.current = collaborationMode;
  }, [collaborationMode]);

  // Update cursor position in presence channel (throttled)
  const updateCursorPosition = useRef(
    (() => {
      let lastUpdate = 0;
      return (x, y) => {
        const now = Date.now();
        if (now - lastUpdate < 33) return; // Throttle to 30fps (better for network)
        lastUpdate = now;

        if (presenceChannel.current && collaborationModeRef.current) {
          localCursorPosition.current = { x, y };
          presenceChannel.current.send({
            type: 'broadcast',
            event: 'cursor',
            payload: {
              username: window.__currentUsername || 'anonymous',
              x,
              y,
              color: window.__userColor || '#FFFFFF'
            }
          });
        }
      };
    })()
  ).current;

  // Send chat message
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !collaborationMode || !collaborationBoardId || !currentUser) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          board_id: collaborationBoardId,
          user_id: currentUser.username,
          username: currentUser.name || currentUser.username,
          content: chatInput.trim(),
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error sending message:', error);
      } else {
        setChatInput('');
      }
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  };

  // Add comment to element
  const addComment = async (elementId, content) => {
    if (!content.trim() || !collaborationMode || !collaborationBoardId || !currentUser) return;

    try {
      const newComment = {
        board_id: collaborationBoardId,
        element_id: elementId,
        user_id: currentUser.username,
        username: currentUser.name || currentUser.username,
        content: content.trim(),
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('comments')
        .insert(newComment)
        .select()
        .single();

      if (error) {
        console.error('Error adding comment:', error);
      } else {
        setComments(prev => ({
          ...prev,
          [elementId]: [...(prev[elementId] || []), data]
        }));
        setCommentInput('');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  // Handle right-click context menu on elements
  const handleElementContextMenu = (e, elementId) => {
    if (!collaborationMode) return;
    e.preventDefault();
    e.stopPropagation();
    const worldCoords = getWorldCoords(e);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      elementId,
      worldX: worldCoords.x,
      worldY: worldCoords.y
    });
  };

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Supabase: Save to shared board
  const saveToSharedBoard = async () => {
    if (!collaborationMode || !collaborationBoardId) return;
    // Don't save if this was a remote update to prevent infinite loops
    if (isRemoteUpdate.current) return;

    try {
      const { error } = await supabase
        .from('boards')
        .upsert({
          id: collaborationBoardId,
          elements: elementsRef.current,
          groups: groupsRef.current,
          viewport: { x: 0, y: 0, zoom },
          updated_by: currentUser?.username,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving to shared board:', error);
      } else {
        console.log('Saved to shared board:', collaborationBoardId);
      }
    } catch (err) {
      console.error('Error saving to Supabase:', err);
    }
  };

  // Collaboration: Auto-save changes to Supabase (debounced)
  useEffect(() => {
    if (!collaborationMode) return;
    // Don't trigger save for remote updates
    if (isRemoteUpdate.current) return;

    const saveTimeout = setTimeout(() => {
      saveToSharedBoard();
    }, 1000); // Debounce saves

    return () => clearTimeout(saveTimeout);
  }, [elements, groups, collaborationMode]);

  // Auto-save to Supabase
  const saveToCloud = async () => {
    if (!currentUser) return;
    
    try {
      const savedAt = new Date();
      const boardId = `${currentUser.username}-${currentBoardName}`;

      const { error } = await supabase
        .from('boards')
        .upsert({
          id: boardId,
          name: currentBoardName,
          elements,
          groups,
          viewport: { x: 0, y: 0, zoom, deletedIds: Array.from(deletedIds) },
          created_by: currentUser.username,
          updated_by: currentUser.username,
          updated_at: savedAt.toISOString()
        });
      
      if (error) {
        console.error('Supabase save error:', error);
      } else {
        setLastSaved(savedAt);
        lastSavedRef.current = savedAt;
        console.log('Saved to Supabase');
      }
    } catch (err) {
      console.error('Error saving to Supabase:', err);
    }
  };

  // Load from Supabase
  const loadFromCloud = async (boardName) => {
    if (!currentUser) return;
    
    try {
      const boardId = `${currentUser.username}-${boardName}`;
      
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (error) throw error;

      if (data) {
        setElements(data.elements || []);
        setGroups(data.groups || []);
        setZoom(data.viewport?.zoom || 1);
        setCurrentBoardName(boardName);
        setLastSaved(new Date(data.updated_at));
        alert(`Loaded: ${boardName}`);
      }
    } catch (err) {
      console.error('Error loading from Supabase:', err);
      alert('Board not found');
    }
  };

  // List all boards for current user
  const listCloudBoards = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('boards')
        .select('id, name')
        .eq('created_by', currentUser.username);

      if (error) throw error;

      if (data && data.length > 0) {
        const boardNames = data.map(b => b.name || b.id);
        alert(`Your boards:\n\n${boardNames.join('\n')}`);
      } else {
        alert('No boards found.');
      }
    } catch (err) {
      console.error('Error listing boards:', err);
    }
  };

  // Auto-save to IndexedDB (fallback when file system not available)
  const saveToIndexedDB = async () => {
    try {
      const db = await openDB();
      const boardData = {
        name: currentBoardName,
        elements,
        groups,
        zoom,
        deletedIds: Array.from(deletedIds),
        savedAt: new Date().toISOString()
      };

      const tx = db.transaction('boards', 'readwrite');
      await tx.objectStore('boards').put(boardData);
      await tx.done;
      setLastSaved(new Date());
    } catch (err) {
      console.error('Error saving to IndexedDB:', err);
    }
  };

  // Keep refs in sync with state for realtime callbacks
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);
  
  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  useEffect(() => {
    deletedIdsRef.current = deletedIds;
  }, [deletedIds]);

  // Auto-save effect
  useEffect(() => {
    // Skip auto-save if this change came from a remote update
    if (isRemoteUpdate.current) return;
    
    const autoSave = setTimeout(() => {
      if ((elements.length > 0 || groups.length > 0) && currentUser) {
        // Save to Supabase
        saveToCloud();
      }
    }, 750);

    return () => clearTimeout(autoSave);
  }, [elements, groups, currentUser]);

  // Load from Supabase on login and subscribe to realtime updates
  useEffect(() => {
    if (!currentUser) return;
    // Skip personal board subscription if in collaboration mode
    if (collaborationMode) return;

    const boardId = `${currentUser.username}-${currentBoardName}`;
    
    const loadData = async () => {
      // Check if user wants to start fresh
      const urlParams = new URLSearchParams(window.location.search);
      const startFresh = urlParams.get('fresh') === 'true';
      
      if (startFresh) {
        console.log('Starting with fresh board');
        return;
      }
      
      // Try Supabase
      try {
        console.log('Loading board:', boardId);

        const { data, error } = await supabase
          .from('boards')
          .select('*')
          .eq('id', boardId)
          .single();

        if (error) {
          console.log('Supabase error:', error);
        }

        if (data) {
          const loadedDeletedIds = new Set(data.viewport?.deletedIds || []);
          isRemoteUpdate.current = true;
          setElements((data.elements || []).filter(el => !loadedDeletedIds.has(el.id)));
          setGroups((data.groups || []).filter(g => !loadedDeletedIds.has(g.id)));
          setDeletedIds(loadedDeletedIds);
          setZoom(data.viewport?.zoom || 1);
          const savedTime = new Date(data.updated_at);
          setLastSaved(savedTime);
          lastSavedRef.current = savedTime;
          console.log('Loaded from Supabase:', data.elements?.length, 'elements,', loadedDeletedIds.size, 'deleted');
          setTimeout(() => { isRemoteUpdate.current = false; }, 100);
          return;
        }
      } catch (err) {
        console.log('Error loading from Supabase:', err);
      }
      
      // Fallback to IndexedDB
      try {
        const db = await openDB();
        const tx = db.transaction('boards', 'readonly');
        const boardData = await tx.objectStore('boards').get(currentBoardName);
        
        if (boardData) {
          const loadedDeletedIds = new Set(boardData.deletedIds || []);
          setElements((boardData.elements || []).filter(el => !loadedDeletedIds.has(el.id)));
          setGroups((boardData.groups || []).filter(g => !loadedDeletedIds.has(g.id)));
          setDeletedIds(loadedDeletedIds);
          setZoom(boardData.zoom || 1);
          const savedTime = new Date(boardData.savedAt);
          setLastSaved(savedTime);
          lastSavedRef.current = savedTime;
          console.log('Loaded from IndexedDB');
        }
      } catch (err) {
        console.log('No saved data in IndexedDB');
      }
    };
    
    loadData();
    
    // Subscribe to realtime updates for this board
    console.log('Subscribing to realtime updates for:', boardId);
    realtimeChannel.current = supabase
      .channel(`board:${boardId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'boards', filter: `id=eq.${boardId}` },
        (payload) => {
          console.log('Realtime update received:', payload);
          if (payload.new) {
            const remoteElements = payload.new.elements || [];
            const remoteGroups = payload.new.groups || [];
            const remoteDeletedIds = new Set(payload.new.viewport?.deletedIds || []);

            // Merge local and remote deleted IDs
            const localDeletedIds = deletedIdsRef.current;
            const mergedDeletedIds = new Set([...localDeletedIds, ...remoteDeletedIds]);

            // Merge strategy: combine local and remote elements by ID
            // But filter out anything in the tombstone set
            const localElements = elementsRef.current;
            const localGroups = groupsRef.current;

            // Create maps for quick lookup
            const remoteElementMap = new Map(remoteElements.map(el => [el.id, el]));

            // Merged elements: start with all remote elements, then add local-only elements
            // Filter out deleted items
            const mergedElements = remoteElements.filter(el => !mergedDeletedIds.has(el.id));
            localElements.forEach(localEl => {
              if (!remoteElementMap.has(localEl.id) && !mergedDeletedIds.has(localEl.id)) {
                // This is a new local element not yet in remote and not deleted - keep it
                mergedElements.push(localEl);
              }
            });

            // Same for groups
            const remoteGroupMap = new Map(remoteGroups.map(g => [g.id, g]));
            const mergedGroups = remoteGroups.filter(g => !mergedDeletedIds.has(g.id));
            localGroups.forEach(localG => {
              if (!remoteGroupMap.has(localG.id) && !mergedDeletedIds.has(localG.id)) {
                mergedGroups.push(localG);
              }
            });

            console.log('Merging:', localElements.length, 'local +', remoteElements.length, 'remote =', mergedElements.length, 'merged, deleted:', mergedDeletedIds.size);

            isRemoteUpdate.current = true;
            setElements(mergedElements);
            setGroups(mergedGroups);
            setDeletedIds(mergedDeletedIds);
            setLastSaved(new Date(payload.new.updated_at));
            lastSavedRef.current = new Date(payload.new.updated_at);
            setTimeout(() => { isRemoteUpdate.current = false; }, 100);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
    
    // Cleanup subscription on unmount or user change
    return () => {
      if (realtimeChannel.current) {
        console.log('Unsubscribing from realtime');
        supabase.removeChannel(realtimeChannel.current);
        realtimeChannel.current = null;
      }
    };
  }, [currentUser, currentBoardName, collaborationMode]);

  // Track changes for history
  useEffect(() => {
    if (!isUndoRedo) {
      const timeoutId = setTimeout(() => {
        saveToHistory();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [elements, groups]);

  // Initialize history with empty state
  useEffect(() => {
    if (history.length === 0) {
      const initialState = {
        elements: elements.map(el => ({ ...el })),
        groups: groups.map(g => ({ ...g, elements: g.elements.map(e => ({ ...e })) }))
      };
      setHistory([initialState]);
      setHistoryIndex(0);
    }
  }, []);

  // Load starter template on first mount
  useEffect(() => {
    const loadStarterTemplate = () => {
      if (elements.length === 0 && groups.length === 0) {
        const centerX = 5000;
        const centerY = 5000;
        
        const starterElements = [
          {
            id: Date.now() + 1,
            type: 'text',
            x: centerX - 300,
            y: centerY - 200,
            content: '<b>PLANNING BOARD</b>',
            fontSize: 16,
            width: 300,
            height: 60,
          },
          {
            id: Date.now() + 2,
            type: 'text',
            x: centerX - 300,
            y: centerY - 120,
            content: 'Press T for text\nPress I for images\nPress D to draw\nPress L for lines\nPress S to select\n\nSpacebar + Drag to pan\nCtrl+Z to undo\n\n<b>Ctrl+B</b> = Bold\n<i>Ctrl+I</i> = Italic',
            fontSize: 14,
            width: 250,
            height: 240,
          },
          {
            id: Date.now() + 3,
            type: 'text',
            x: centerX + 50,
            y: centerY - 200,
            content: '<b>Ideas Section</b>',
            fontSize: 16,
            width: 200,
            height: 50,
          },
          {
            id: Date.now() + 4,
            type: 'text',
            x: centerX + 50,
            y: centerY - 130,
            content: '• Add your ideas here\n• Drag to move\n• Double-click to edit',
            fontSize: 14,
            width: 250,
            height: 100,
          },
          {
            id: Date.now() + 5,
            type: 'text',
            x: centerX + 350,
            y: centerY - 200,
            content: '<b>Tasks</b>',
            fontSize: 16,
            width: 200,
            height: 50,
          },
          {
            id: Date.now() + 6,
            type: 'text',
            x: centerX + 350,
            y: centerY - 130,
            content: '• Task 1\n• Task 2\n• Task 3',
            fontSize: 14,
            width: 200,
            height: 100,
          },
        ];
        
        const starterDrawings = [
          {
            id: Date.now() + 7,
            type: 'line',
            path: [
              { x: centerX - 320, y: centerY - 180 },
              { x: centerX - 350, y: centerY - 180 }
            ],
            color: '#ffffff',
            width: 2
          },
          {
            id: Date.now() + 8,
            type: 'line',
            path: [
              { x: centerX + 50, y: centerY - 145 },
              { x: centerX + 200, y: centerY - 145 }
            ],
            color: '#ffffff',
            width: 2
          },
          {
            id: Date.now() + 9,
            type: 'draw',
            path: [
              { x: centerX + 340, y: centerY - 210 },
              { x: centerX + 560, y: centerY - 210 },
              { x: centerX + 560, y: centerY - 20 },
              { x: centerX + 340, y: centerY - 20 },
              { x: centerX + 340, y: centerY - 210 }
            ],
            color: '#ffffff',
            width: 2
          }
        ];
        
        setElements([...starterElements, ...starterDrawings]);
        
        setTimeout(() => {
          if (canvasRef.current) {
            canvasRef.current.scrollLeft = centerX - (canvasRef.current.clientWidth / 2);
            canvasRef.current.scrollTop = centerY - (canvasRef.current.clientHeight / 2);
          }
          saveToHistory();
        }, 100);
      }
    };
    
    const timer = setTimeout(loadStarterTemplate, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (editingText && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [editingText]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.02 : 0.02;
        handleZoomChange(zoom + delta, e.clientX, e.clientY, false); // false = use setTimeout like old version
      }
    };
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener('wheel', handleWheel);
      }
    };
  }, [zoom]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ' && !editingText) {
        e.preventDefault();
        setSpacePressed(true);
        return;
      }
      
      if (e.key.toLowerCase() === 'f' && !editingText) {
        e.preventDefault();
        zoomToFit();
        return;
      }
      
      if (e.shiftKey && e.key === '!' && !editingText) {
        e.preventDefault();
        zoomToFit();
        return;
      }
      
      if (e.shiftKey && e.key === ')' && !editingText) {
        e.preventDefault();
        resetView();
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !editingText) {
        e.preventDefault();
        undo();
        return;
      }
      
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || 
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        if (!editingText) {
          e.preventDefault();
          redo();
          return;
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !editingText && selectedElements.length > 0) {
        e.preventDefault();
        copyElements();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !editingText) {
        e.preventDefault();
        pasteElements();
      }
      
      // Toggle help modal with P key
      if (e.key === 'p' || e.key === 'P') {
        if (!editingText) {
          e.preventDefault();
          setShowHelp(!showHelp);
        }
      }
      
      if ((e.key === 'Escape' || e.key === 'Backspace') && selectedElements.length > 0 && !editingText) {
        e.preventDefault();
        deleteElements();
      }
      
      if (!editingText) {
        switch(e.key.toLowerCase()) {
          case 's':
            setSelectedTool('select');
            break;
          case 'k':
            if (selectedElements.length > 0) {
              setSelectedTool('scale');
            }
            break;
          case 't':
            setSelectedTool('text');
            setTextMode('normal');
            break;
          case 'i':
            setSelectedTool('image');
            break;
          case 'l':
            setSelectedTool('line');
            break;
          case 'd':
            setSelectedTool('draw');
            break;
          case 'e':
            setSelectedTool('erase');
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    const handleKeyUp = (e) => {
      if (e.key === ' ') {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedElements, elements, editingText, clipboard, selectedTool, zoom, historyIndex, history.length]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) return;
    
    const { x, y } = getWorldCoords(e);

    files.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newElement = {
            id: Date.now() + index,
            type: 'image',
            x: x + (index * 20),
            y: y + (index * 20),
            src: event.target.result,
            width: 200,
            height: 200,
            filename: file.name
          };
          setElements(prev => [...prev, newElement]);
          setTimeout(() => {
            saveToHistory();
          }, 50);
          if (index === files.length - 1) {
            setSelectedTool('select');
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleCanvasClick = (e) => {
    if (editingText) {
      handleTextSubmit();
      return;
    }
    
    // Double-click detection to return to select tool
    const now = Date.now();
    if (now - lastCanvasClick < 300) {
      // Double click detected - return to select tool if not already there
      if (selectedTool !== 'select') {
        setSelectedTool('select');
      }
      setLastCanvasClick(0);
      if (clickTimeout) clearTimeout(clickTimeout);
      return;
    }
    
    setLastCanvasClick(now);
    
    if (isDrawing) return;

    const { x, y } = getWorldCoords(e);

    // Handle tool-specific canvas clicks first
    const tool = toolDefinitions[selectedTool];
    if (tool && tool.onCanvasClick) {
      const context = {
        elements,
        setElements,
        setEditingText,
        setTextInput,
        setSelectedTool,
        saveToHistory,
        justFinishedTextEdit,
      };
      tool.onCanvasClick({ x, y }, context);
      return;
    }
    
    // Deselect all when clicking empty canvas in select mode
    // BUT NOT if we just finished a selection box drag
    if (selectedTool === 'select' && !justFinishedSelecting) {
      setSelectedElements([]);
      return;
    }
  };

  const isElementInSelection = (element, box) => {
    if (element.type === 'draw' || element.type === 'line') {
      return element.path.some(point => 
        point.x >= box.x && 
        point.x <= box.x + box.width &&
        point.y >= box.y && 
        point.y <= box.y + box.height
      );
    }
    
    const elRight = element.x + (element.width || 100);
    const elBottom = element.y + (element.height || 30);
    
    return !(element.x > box.x + box.width ||
             elRight < box.x ||
             element.y > box.y + box.height ||
             elBottom < box.y);
  };

  const splitPathByEraseBox = (path, box) => {
    const segments = [];
    let currentSegment = [];
    
    for (let i = 0; i < path.length; i++) {
      const point = path[i];
      const isInside = point.x >= box.x && 
                       point.x <= box.x + box.width &&
                       point.y >= box.y && 
                       point.y <= box.y + box.height;
      
      if (!isInside) {
        currentSegment.push(point);
      } else {
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
          currentSegment = [];
        }
      }
    }
    
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }
    
    return segments.filter(seg => seg.length > 1);
  };

  const createGroup = () => {
    const groupId = 'group_' + Date.now();
    const selectedEls = elements.filter(el => selectedElements.includes(el.id));
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    selectedEls.forEach(el => {
      if (el.type === 'draw' || el.type === 'line') {
        el.path.forEach(point => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });
      } else {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + (el.width || 100));
        maxY = Math.max(maxY, el.y + (el.height || 30));
      }
    });
    
    const group = {
      id: groupId,
      type: 'group',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      elementIds: selectedElements,
      elements: selectedEls.map(el => ({ ...el }))
    };
    
    setGroups([...groups, group]);
    setElements(elements.filter(el => !selectedElements.includes(el.id)));
    setSelectedElements([groupId]);
  };

  const ungroupGroup = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    setElements([...elements, ...group.elements]);
    setGroups(groups.filter(g => g.id !== groupId));
    setSelectedElements([]);
  };

  const handleElementMouseDown = (e, elementId) => {
    if (selectedTool === 'text' && !editingText) {
      const element = elements.find(el => el.id === elementId);
      const group = groups.find(g => g.id === elementId);
      
      if (element && element.type === 'text') {
        e.stopPropagation();
        e.preventDefault();
        setEditingText(elementId);
        setTextInput(element.content);
        return;
      }
      
      if (group) {
        return;
      }
    }
    
    if (selectedTool === 'select' && !editingText) {
      e.stopPropagation();
      e.preventDefault();
      
      let updatedSelection;
      
      if (!selectedElements.includes(elementId)) {
        // Clicking a new element
        if (e.shiftKey) {
          // Add to selection
          updatedSelection = [...selectedElements, elementId];
        } else {
          // Replace selection
          updatedSelection = [elementId];
        }
        setSelectedElements(updatedSelection);
      } else {
        // Clicking an already-selected element - keep all selected
        updatedSelection = selectedElements;
      }
      
      setIsDragging(true);
      const { x: mouseX, y: mouseY } = getWorldCoords(e);
      
      const offsets = {};
      
      // Calculate offsets for ALL selected elements
      updatedSelection.forEach(id => {
        const element = elements.find(el => el.id === id);
        const group = groups.find(g => g.id === id);
        
        if (element) {
          offsets[id] = {
            x: mouseX - element.x,
            y: mouseY - element.y
          };
        } else if (group) {
          offsets[id] = {
            x: mouseX - group.x,
            y: mouseY - group.y
          };
        }
      });
      setDragOffsets(offsets);
    }
  };

  const handleResizeMouseDown = (e, elementId) => {
    e.stopPropagation();
    e.preventDefault();
    
    const element = elements.find(el => el.id === elementId);
    const group = groups.find(g => g.id === elementId);
    
    if (element) {
      setResizingElement(elementId);
      const { x: mouseX, y: mouseY } = getWorldCoords(e);
      
      setResizeStart({
        x: mouseX,
        y: mouseY,
        width: element.width || 200,
        height: element.height || 40
      });
    } else if (group) {
      setResizingElement(elementId);
      const { x: mouseX, y: mouseY } = getWorldCoords(e);
      
      setResizeStart({
        x: mouseX,
        y: mouseY,
        width: group.width,
        height: group.height
      });
    }
  };

  const handleCanvasMouseDown = (e) => {
    if (editingText) return;
    
    if (e.button === 1 || (e.button === 0 && spacePressed)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    const { x, y } = getWorldCoords(e);

    // Handle scale tool
    if (selectedTool === 'scale' && selectedElements.length > 0) {
      setIsScaling(true);
      setScaleStart({ x, y });
      
      // Calculate the center/origin of all selected elements
      const selectedEls = elements.filter(el => selectedElements.includes(el.id));
      const selectedGrps = groups.filter(g => selectedElements.includes(g.id));
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      selectedEls.forEach(el => {
        if (el.type === 'draw' || el.type === 'line') {
          el.path.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
          });
        } else {
          minX = Math.min(minX, el.x);
          minY = Math.min(minY, el.y);
          maxX = Math.max(maxX, el.x + (el.width || 100));
          maxY = Math.max(maxY, el.y + (el.height || 100));
        }
      });
      
      selectedGrps.forEach(g => {
        minX = Math.min(minX, g.x);
        minY = Math.min(minY, g.y);
        maxX = Math.max(maxX, g.x + g.width);
        maxY = Math.max(maxY, g.y + g.height);
      });
      
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      setScaleOrigin({ x: centerX, y: centerY });
      
      // Store original states
      setOriginalElementStates([
        ...selectedEls.map(el => ({ ...el })),
        ...selectedGrps.map(g => ({ ...g, elements: g.elements.map(e => ({ ...e })) }))
      ]);
      
      return;
    }

    const tool = toolDefinitions[selectedTool];
    if (tool && tool.onMouseDown) {
      const context = {
        setIsSelecting,
        setSelectionStart,
        setSelectionBox,
        setSelectedElements,
        setIsErasing,
        setEraseBox,
        setEraseStart,
        setIsDrawing,
        setCurrentPath,
        currentPath,
        isDrawing,
        selectedElements,
        setIsScaling,
        setScaleStart,
      };
      tool.onMouseDown({ x, y, target: e }, context);
    }
  };

  const handleMouseMove = (e) => {
    if (editingText) return;

    setMousePos({ x: e.clientX, y: e.clientY });

    // Get world coordinates for cursor tracking
    const worldCoords = getWorldCoords(e);

    // Update cursor position for collaboration
    if (collaborationMode) {
      updateCursorPosition(worldCoords.x, worldCoords.y);
    }

    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;

      if (canvasRef.current) {
        canvasRef.current.scrollLeft -= deltaX;
        canvasRef.current.scrollTop -= deltaY;
      }

      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const { x, y } = worldCoords;

    // Handle scaling
    if (isScaling && scaleStart && scaleOrigin) {
      const startDist = Math.sqrt(
        Math.pow(scaleStart.x - scaleOrigin.x, 2) + 
        Math.pow(scaleStart.y - scaleOrigin.y, 2)
      );
      const currentDist = Math.sqrt(
        Math.pow(x - scaleOrigin.x, 2) + 
        Math.pow(y - scaleOrigin.y, 2)
      );
      
      const scale = currentDist / startDist;
      
      // Scale all selected elements
      const scaledElements = elements.map(el => {
        if (!selectedElements.includes(el.id)) return el;
        
        const original = originalElementStates.find(o => o.id === el.id);
        if (!original) return el;
        
        if (el.type === 'draw' || el.type === 'line') {
          return {
            ...el,
            path: original.path.map(point => ({
              x: scaleOrigin.x + (point.x - scaleOrigin.x) * scale,
              y: scaleOrigin.y + (point.y - scaleOrigin.y) * scale
            })),
            width: original.width * scale
          };
        } else {
          return {
            ...el,
            x: scaleOrigin.x + (original.x - scaleOrigin.x) * scale,
            y: scaleOrigin.y + (original.y - scaleOrigin.y) * scale,
            width: original.width * scale,
            height: original.height * scale,
            fontSize: original.fontSize ? original.fontSize * scale : el.fontSize
          };
        }
      });
      
      const scaledGroups = groups.map(g => {
        if (!selectedElements.includes(g.id)) return g;
        
        const original = originalElementStates.find(o => o.id === g.id);
        if (!original) return g;
        
        return {
          ...g,
          x: scaleOrigin.x + (original.x - scaleOrigin.x) * scale,
          y: scaleOrigin.y + (original.y - scaleOrigin.y) * scale,
          width: original.width * scale,
          height: original.height * scale,
          elements: original.elements.map(el => {
            if (el.type === 'draw' || el.type === 'line') {
              return {
                ...el,
                path: el.path.map(point => ({
                  x: scaleOrigin.x + (point.x - scaleOrigin.x) * scale,
                  y: scaleOrigin.y + (point.y - scaleOrigin.y) * scale
                })),
                width: el.width * scale
              };
            } else {
              return {
                ...el,
                x: scaleOrigin.x + (el.x - scaleOrigin.x) * scale,
                y: scaleOrigin.y + (el.y - scaleOrigin.y) * scale,
                width: el.width * scale,
                height: el.height * scale,
                fontSize: el.fontSize ? el.fontSize * scale : el.fontSize
              };
            }
          })
        };
      });
      
      setElements(scaledElements);
      setGroups(scaledGroups);
      return;
    }

    if (resizingElement) {
      const deltaX = x - resizeStart.x;
      const deltaY = y - resizeStart.y;
      
      setElements(elements.map(el => {
        if (el.id === resizingElement && (el.type === 'image' || el.type === 'text')) {
          return {
            ...el,
            width: Math.max(50, resizeStart.width + deltaX),
            height: Math.max(30, resizeStart.height + deltaY)
          };
        }
        return el;
      }));
      
      setGroups(groups.map(g => {
        if (g.id === resizingElement) {
          const scaleX = Math.max(50, resizeStart.width + deltaX) / resizeStart.width;
          const scaleY = Math.max(50, resizeStart.height + deltaY) / resizeStart.height;
          
          return {
            ...g,
            width: Math.max(50, resizeStart.width + deltaX),
            height: Math.max(50, resizeStart.height + deltaY),
            elements: g.elements.map(el => {
              if (el.type === 'draw' || el.type === 'line') {
                return {
                  ...el,
                  path: el.path.map(point => ({
                    x: g.x + (point.x - g.x) * scaleX,
                    y: g.y + (point.y - g.y) * scaleY
                  }))
                };
              }
              return {
                ...el,
                x: g.x + (el.x - g.x) * scaleX,
                y: g.y + (el.y - g.y) * scaleY,
                width: el.width ? el.width * scaleX : el.width,
                height: el.height ? el.height * scaleY : el.height
              };
            })
          };
        }
        return g;
      }));
    } else if (isErasing && eraseStart) {
      const newBox = getDragBox(eraseStart, { x, y });
      setEraseBox(newBox);
    } else if (isSelecting && selectionStart) {
      const newBox = getDragBox(selectionStart, { x, y });
      
      setSelectionBox(newBox);
      
      const selectedEls = elements
        .filter(el => isElementInSelection(el, newBox))
        .map(el => el.id);
      
      const selectedGrps = groups
        .filter(g => {
          return !(g.x > newBox.x + newBox.width ||
                   g.x + g.width < newBox.x ||
                   g.y > newBox.y + newBox.height ||
                   g.y + g.height < newBox.y);
        })
        .map(g => g.id);
      
      setSelectedElements([...selectedEls, ...selectedGrps]);
    } else if (isDragging && selectedElements.length > 0) {
      setElements(elements.map(el => {
        if (selectedElements.includes(el.id) && dragOffsets[el.id]) {
          return {
            ...el,
            x: x - dragOffsets[el.id].x,
            y: y - dragOffsets[el.id].y
          };
        }
        return el;
      }));
      
      setGroups(groups.map(g => {
        if (selectedElements.includes(g.id) && dragOffsets[g.id]) {
          const deltaX = (x - dragOffsets[g.id].x) - g.x;
          const deltaY = (y - dragOffsets[g.id].y) - g.y;
          
          return {
            ...g,
            x: x - dragOffsets[g.id].x,
            y: y - dragOffsets[g.id].y,
            elements: g.elements.map(el => {
              if (el.type === 'draw' || el.type === 'line') {
                return {
                  ...el,
                  path: el.path.map(point => ({
                    x: point.x + deltaX,
                    y: point.y + deltaY
                  }))
                };
              }
              return {
                ...el,
                x: el.x + deltaX,
                y: el.y + deltaY
              };
            })
          };
        }
        return g;
      }));
    } else if (isDrawing && (selectedTool === 'draw' || selectedTool === 'line')) {
      const tool = toolDefinitions[selectedTool];
      if (tool && tool.onMouseMove) {
        const context = {
          isDrawing,
          currentPath,
          setCurrentPath,
        };
        tool.onMouseMove({ x, y }, context);
      }
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    
    if (isScaling) {
      setIsScaling(false);
      setScaleStart(null);
      setScaleOrigin(null);
      setOriginalElementStates([]);
      saveToHistory(); // Save to history after scaling
      return;
    }
    
    const tool = toolDefinitions[selectedTool];
    if (tool && tool.onMouseUp && (isDrawing || isErasing)) {
      const context = {
        isDrawing,
        currentPath,
        setCurrentPath,
        elements,
        setElements,
        isErasing,
        eraseBox,
        setEraseBox,
      };
      tool.onMouseUp({}, context);
    }
    
    if (isErasing && eraseBox) {
      const newElements = [];
      
      elements.forEach(el => {
        if (el.type === 'draw' || el.type === 'line') {
          const segments = splitPathByEraseBox(el.path, eraseBox);
          segments.forEach((segment, idx) => {
            newElements.push({
              ...el,
              id: el.id + '_' + idx + '_' + Date.now(),
              path: segment
            });
          });
        } else {
          newElements.push(el);
        }
      });
      
      setElements(newElements);
      setEraseBox(null);
    }
    
    // Track if we just finished a selection box drag
    if (isSelecting && selectionBox) {
      setJustFinishedSelecting(true);
      // Clear the flag after a short delay
      setTimeout(() => setJustFinishedSelecting(false), 50);
    }
    
    setIsDragging(false);
    setIsDrawing(false);
    setIsSelecting(false);
    setIsErasing(false);
    setSelectionBox(null);
    setSelectionStart(null);
    setEraseBox(null);
    setEraseStart(null);
    setResizingElement(null);
  };

  const handleDoubleClick = (e, elementId) => {
    e.stopPropagation();
    const element = elements.find(el => el.id === elementId);
    if (element && element.type === 'text') {
      setEditingText(elementId);
      setTextInput(element.content);
      setSelectedTool('select');
    }
  };

  const handleTextChange = (e) => {
    setTextInput(e.target.value);
    
    if (textInputRef.current) {
      const element = elements.find(el => el.id === editingText);
      if (element) {
        const scrollHeight = textInputRef.current.scrollHeight;
        const newHeight = Math.max(element.height || 40, scrollHeight + 4);
        
        setElements(elements.map(el =>
          el.id === editingText ? { ...el, height: newHeight } : el
        ));
      }
    }
  };

  const handleTextSubmit = () => {
    if (editingText) {
      if (textInput.trim() === '') {
        setElements(elements.filter(el => el.id !== editingText));
      } else {
        setElements(elements.map(el =>
          el.id === editingText ? { ...el, content: textInput } : el
        ));
      }
      setEditingText(null);
      setTextInput('');
      setSelectedTool('select');
      // Set grace flag to prevent immediate new text box creation
      setJustFinishedTextEdit(true);
      setTimeout(() => setJustFinishedTextEdit(false), 100);
    }
  };

  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      return;
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setElements(elements.filter(el => el.id !== editingText));
      setEditingText(null);
      setTextInput('');
      setSelectedTool('select');
      // Set grace flag to prevent immediate new text box creation
      setJustFinishedTextEdit(true);
      setTimeout(() => setJustFinishedTextEdit(false), 100);
    }
  };

  const deleteElements = () => {
    if (selectedElements.length > 0) {
      // Add deleted IDs to tombstone set
      setDeletedIds(prev => {
        const newSet = new Set(prev);
        selectedElements.forEach(id => newSet.add(id));
        return newSet;
      });
      setElements(elements.filter(el => !selectedElements.includes(el.id)));
      setGroups(groups.filter(g => !selectedElements.includes(g.id)));
      setSelectedElements([]);
      saveToHistory(); // Save to history after deletion
    }
  };

  const copyElements = () => {
    if (selectedElements.length === 0) return;
    
    const copiedElements = elements.filter(el => selectedElements.includes(el.id));
    const copiedGroups = groups.filter(g => selectedElements.includes(g.id));
    
    setClipboard({
      elements: copiedElements.map(el => ({ ...el })),
      groups: copiedGroups.map(g => ({ ...g, elements: g.elements.map(e => ({ ...e })) }))
    });
  };

  const pasteElements = () => {
    if (!clipboard.elements && !clipboard.groups) return;
    if (clipboard.elements?.length === 0 && clipboard.groups?.length === 0) return;
    
    const newElements = [];
    const newGroups = [];
    const idMapping = {};
    const offset = 20;
    
    if (clipboard.elements) {
      clipboard.elements.forEach(el => {
        const newId = Date.now() + Math.random();
        idMapping[el.id] = newId;
        
        if (el.type === 'draw' || el.type === 'line') {
          newElements.push({
            ...el,
            id: newId,
            path: el.path.map(p => ({ x: p.x + offset, y: p.y + offset }))
          });
        } else {
          newElements.push({
            ...el,
            id: newId,
            x: el.x + offset,
            y: el.y + offset
          });
        }
      });
    }
    
    if (clipboard.groups) {
      clipboard.groups.forEach(g => {
        const newGroupId = 'group_' + Date.now() + Math.random();
        
        newGroups.push({
          ...g,
          id: newGroupId,
          x: g.x + offset,
          y: g.y + offset,
          elements: g.elements.map(el => {
            if (el.type === 'draw' || el.type === 'line') {
              return {
                ...el,
                id: Date.now() + Math.random(),
                path: el.path.map(p => ({ x: p.x + offset, y: p.y + offset }))
              };
            } else {
              return {
                ...el,
                id: Date.now() + Math.random(),
                x: el.x + offset,
                y: el.y + offset
              };
            }
          })
        });
      });
    }
    
    setElements([...elements, ...newElements]);
    setGroups([...groups, ...newGroups]);
    
    const newIds = [...newElements.map(el => el.id), ...newGroups.map(g => g.id)];
    setSelectedElements(newIds);
  };

  const renderPath = (path) => {
    if (path.length < 2) return '';
    return path.map((point, i) =>
      i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    ).join(' ');
  };

  const visibleElements = getVisibleElements();

  // If not authenticated, show login page
  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-screen bg-black flex flex-col items-center justify-center font-mono p-8">
        <div className="w-full max-w-sm">
          {/* ASCII Art Header */}
          <div className="flex justify-center" style={{ height: '100px', marginBottom: '20px' }}>
            <div className="overflow-visible flex items-center justify-center">
              <pre 
                className="text-white font-mono text-center whitespace-pre"
                style={{ 
                  fontSize: '10px', 
                  lineHeight: '10px',
                  transform: 'scale(0.35)',
                  transformOrigin: 'center center'
                }}
              >
{`              ***************************************************************************************************             
            ********************************************************************************************************          
          ****                                                                                                    ****        
         ***                                            ************                                               ****       
        ***                                          *****        ******                                            ****      
        **                                        ***** ************ ****                                            ***      
        **                            *****      **** **************** ****      *****                               ***      
        **                            ********  *** ******************** ***  ********                               ***      
        **                            **    ****** **********************  *****    **                               ***      
        **                            ** ***  *** ************************ **** **  **                               ***      
        **                            **  ****  * ************************   *****  **                               ***      
        **                            **   *****  ****   **** * ***     **  ****    **                               ***      
        **                             ** **  ** ******             ******  *** **  **                               ***      
        **                             ** ***  ********     ****      ****  *  *** **                                ***      
        **                              ** ***  *********** ****  ***********  *** **                                ***      
        **                              ** ***  ********* ********  ********* *** **                                 ***      
        **                         ******** ***  * *****  ********* ************ ******                              ***      
        **                  *******           ***   *** ****  *  *** ***   ****        *******                       ***      
        **                ****                    **** ******   *********                   *****                    ***      
        **             ****                      ********    ***    ******                      ****                 ***      
        **            ***                        ******  *********** *****                         ****              ***      
        **          ***                           ***** ******************                           **              ***      
        **          **                             *******   ***   *******                            ****           ***      
        **         **        *******                ********************                      *****    ****          ***      
        **       ****          **********************   *************      **********************        ***         ***      
        **      ****            ************************             **************************           ***        ***      
        **      ***              *************************************************************             ***       ***      
        **    ***                ******************************************** ********** *****              ***      ***      
        **   ***                    ****************         **************** ********** ****                ***     ***      
        **   **   *****  ***********  ************* ************************* ********** *** *****   *******   **    ***      
        **  **   **      *********** *  ************ ************************ **********   **********     ***   **   ***      
        **  **         ********      *  ******** ***********************  *** ** * * ***  ***** ******           **  ***      
        **  *          ************  *  ******** ********* ***********************  **** ****  ********           ** ***      
        ** **           ****  ***** *** ***** ** ********************************   *****    ***** *****          ******      
        ** **          **********   *  ****** ******  ****************************  ******  **** *******          ******      
        **  **          ********** ********** *****   *************************************    *****  ***         ** ***      
        **  **          ******    *********** ********************         *******  ********  ****  *****         ** ***      
        **   **         ********************* ******************* ******* ******************     *****           **  ***      
        **    ***             * ********** *  ****************** ***************************     ***           ***   ***      
        **     *****           ****  **************        ********** **********************                 ****    ***      
        **        ******      ******** ****   *** ******* *********** ********         *****             ******      ***      
        **           **************************  ******* ************ **************** *****  **************         ***      
        **               *** *******************  ***** ************* **************** ****** ***                    ***      
        **              *** ***************************************** **************** ****** ***                    ***      
        **             *** ****************************************************       ******* ***                    ***      
        ***************** ******            ********************    *************************  *************************      
        ****************                                              **********************   *************************      
                                                                                                                              
            *********     ***********       ****       ******   ***        *****   ****   ************ ***************        
            ****   ****    ****    **      ******       ******   **         *****   ***    ****     ** ***  ***** ****        
            ****   *****   ****            ******       ******   **         ******  ***    ****        **   *****  ***        
            ****    ****   ****           ********      ******** **         ******* ***    ****             *****             
            ****    *****  *********      *** ****      ** ***** **         ***********    **********       *****             
            ****    *****  ***** ***     ***  *****     **  *******         ** ********    ***** ****       *****             
            ****    ****   ****          **********     **   ******         **  *******    ****             *****             
            ****   *****   ****      *  ************    **    *****         **   ******    ****       *     *****             
            ****  *****   *****    ***  ***     *****   **     ****  ****   **    *****    *****    ***     *****             
          ***********    ************* *****  ******** *****    *** ***** ******   ****  **************   ********            
                                                                                                                              
         ***                                                                                                        **        
         ****                                                                                                     *****       
           *****                                                                                                *****         
             ******************************************************************************************************           `}
              </pre>
            </div>
          </div>
          
          {authError && (
            <div className="text-red-500 text-sm mb-4">
              {authError}
            </div>
          )}
          
          <div className="w-full mt-24" style={{ transform: 'scale(0.7)', transformOrigin: 'top center' }}>
            <div className="mb-4">
              <label className="block text-white text-sm mb-1">Username:</label>
              <input
                type="text"
                id="login-username"
                className="w-full bg-black border-b border-white text-white py-1 focus:outline-none text-sm"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-white text-sm mb-1">Password:</label>
              <input
                type="password"
                id="login-password"
                className="w-full bg-black border-b border-white text-white py-1 focus:outline-none text-sm"
              />
            </div>
          
            <button
              onClick={() => {
                const username = document.getElementById('login-username').value.toLowerCase().trim();
                const password = document.getElementById('login-password').value;
                
                const hardcodedUsers = {
                  'kitten': { password: 'dean', name: 'Kitten' },
                  'slime': { password: 'dean', name: 'Slime' }
                };
                
                if (hardcodedUsers[username] && hardcodedUsers[username].password === password) {
                  const user = { username, name: hardcodedUsers[username].name };
                  setCurrentUser(user);
                  setIsAuthenticated(true);
                  localStorage.setItem('planningboard_user', JSON.stringify(user));
                } else {
                  setAuthError('Invalid username or password');
                }
              }}
              className="text-white text-sm hover:underline cursor-pointer"
            >
              LOGIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black flex flex-col overflow-hidden font-mono" style={{ imageRendering: 'pixelated', WebkitFontSmoothing: 'none', fontSmooth: 'never' }}>
      {/* NOTE: To enable Supabase collaboration, add this script tag to your HTML:
          <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
      */}
      {/* Toolbar */}
      <div className="bg-black border-b border-white p-2 flex items-center justify-between">
        <div className="flex gap-1 items-center">
          <div className="flex gap-1">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className={`p-1 border transition-colors ${
                  selectedTool === tool.id
                    ? 'bg-white text-black border-white'
                    : 'bg-black text-white border-white hover:bg-white hover:text-black'
                }`}
                title={`${tool.label} (${tool.hotkey})`}
              >
                <tool.icon size={14} />
              </button>
            ))}
          </div>
          
          {selectedElements.length > 1 && selectedTool === 'select' && (
            <button
              onClick={createGroup}
              className="px-2 py-1 text-xs border bg-black text-white border-white hover:bg-white hover:text-black ml-3"
              title="Group (G)"
            >
              Group
            </button>
          )}
          
          {selectedElements.length === 1 && groups.find(g => g.id === selectedElements[0]) && (
            <button
              onClick={() => ungroupGroup(selectedElements[0])}
              className="px-2 py-1 text-xs border bg-black text-white border-white hover:bg-white hover:text-black ml-3"
              title="Ungroup"
            >
              Ungroup
            </button>
          )}
          
          {selectedElements.length > 0 && (
            <button
              onClick={deleteElements}
              className="p-1 border bg-black text-white border-white hover:bg-white hover:text-black ml-3"
              title="Delete (ESC)"
            >
              <Trash2 size={14} />
            </button>
          )}
          
          <button
            onClick={enableCollaboration}
            className={`px-2 py-1 text-xs border ml-3 ${
              collaborationMode
                ? 'bg-white text-black border-white'
                : 'bg-black text-white border-white hover:bg-white hover:text-black'
            }`}
            title={collaborationMode ? `Board: ${collaborationBoardId} (click to disconnect)` : 'Enable real-time collaboration'}
          >
            {collaborationMode ? 'LIVE' : 'Collaborate'}
          </button>
          {collaborationMode && (
            <div className="flex items-center gap-1 ml-2">
              {/* Show online users */}
              {remoteUsers.length > 0 && remoteUsers.map(user => (
                <div
                  key={user}
                  className="w-3 h-3 rounded-full border border-black"
                  style={{ backgroundColor: userColors[user] || '#FFFFFF' }}
                  title={user}
                />
              ))}
              <span className="text-white text-xs opacity-75 ml-1">
                {collaborationBoardId}
              </span>
            </div>
          )}
          
          <button
            onClick={async () => {
              if (window.confirm('Clear all saved data and start fresh? This will delete your saved board.')) {
                try {
                  // Clear cloud storage
                  if (window.storage) {
                    try {
                      await window.storage.delete(`board:${currentBoardName}`, false);
                    } catch (err) {
                      console.log('No cloud data to clear');
                    }
                  }
                  // Clear IndexedDB
                  try {
                    const db = await openDB();
                    const tx = db.transaction('boards', 'readwrite');
                    await tx.objectStore('boards').delete(currentBoardName);
                    await tx.done;
                  } catch (err) {
                    console.log('No IndexedDB data to clear');
                  }
                  // Clear current board
                  setElements([]);
                  setGroups([]);
                  setSelectedElements([]);
                  setZoom(1);
                  setHistory([]);
                  setHistoryIndex(-1);
                  alert('Storage cleared! Board is now empty.');
                } catch (err) {
                  console.error('Error clearing storage:', err);
                  alert('Error clearing storage. Check console.');
                }
              }
            }}
            className="px-2 py-1 text-xs border bg-black text-white border-white hover:bg-white hover:text-black ml-3"
            title="Clear saved data and start fresh"
          >
            Clear Storage
          </button>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && (
            <span className="text-white text-xs opacity-75 mr-2">
              {currentUser.name || currentUser.email}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="p-1 border bg-black text-white border-white hover:bg-white hover:text-black"
            title="Logout"
          >
            <LogOut size={14} />
          </button>
          <div className="w-px h-4 bg-white opacity-50 mx-1"></div>
          <button
            onClick={zoomToFit}
            className="px-2 py-1 text-xs bg-black text-white border border-white hover:bg-white hover:text-black"
            title="Zoom to fit all content (F)"
          >
            Fit
          </button>
          <button
            onClick={resetView}
            className="px-2 py-1 text-xs bg-black text-white border border-white hover:bg-white hover:text-black"
            title="Reset view (Shift+0)"
          >
            Reset
          </button>
          <button
            onClick={() => handleZoomChange(zoom - 0.05, mousePos.x, mousePos.y, true)}
            className="px-2 py-1 text-xs bg-black text-white border border-white hover:bg-white hover:text-black"
          >
            -
          </button>
          <span className="text-white min-w-12 text-center text-xs">
            {isFitMode ? 'Fit' : `${Math.round(zoom * 100)}%`}
          </span>
          <button
            onClick={() => handleZoomChange(zoom + 0.05, mousePos.x, mousePos.y, true)}
            className="px-2 py-1 text-xs bg-black text-white border border-white hover:bg-white hover:text-black"
          >
            +
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-auto bg-black cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ 
          cursor: isPanning ? 'grabbing' : (spacePressed ? 'grab' : (toolDefinitions[selectedTool]?.cursor || 'default'))
        }}
      >
        <div style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px`, position: 'relative' }}>
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            shapeRendering: 'crispEdges'
          }}
        >
          {visibleElements.elements.filter(el => el.type === 'draw' || el.type === 'line').map(el => (
            <path
              key={el.id}
              d={renderPath(el.path)}
              stroke={el.color}
              strokeWidth={el.width}
              fill="none"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          ))}
          {currentPath.length > 0 && (
            <path
              d={renderPath(currentPath)}
              stroke="#ffffff"
              strokeWidth={2}
              fill="none"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          )}
          {selectionBox && (
            <rect
              x={selectionBox.x}
              y={selectionBox.y}
              width={selectionBox.width}
              height={selectionBox.height}
              fill="rgba(255, 255, 255, 0.1)"
              stroke="white"
              strokeWidth={1}
              strokeDasharray="5,5"
            />
          )}
          {eraseBox && (
            <rect
              x={eraseBox.x}
              y={eraseBox.y}
              width={eraseBox.width}
              height={eraseBox.height}
              fill="rgba(255, 0, 0, 0.1)"
              stroke="red"
              strokeWidth={1}
              strokeDasharray="5,5"
            />
          )}
        </svg>

        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            width: '10000px',
            height: '10000px',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        >
          {visibleElements.groups.map(group => (
            <div
              key={group.id}
              className="absolute"
              style={{
                left: group.x,
                top: group.y,
                width: group.width,
                height: group.height,
                cursor: selectedTool === 'select' ? 'move' : 'default',
                pointerEvents: 'auto',
                border: selectedElements.includes(group.id) 
                  ? '2px dashed rgba(255, 255, 255, 0.5)' 
                  : '0.5px dashed rgba(255, 255, 255, 0.5)'
              }}
              onMouseDown={(e) => handleElementMouseDown(e, group.id)}
              onClick={(e) => e.stopPropagation()}
              onDragStart={(e) => e.preventDefault()}
            >
              {selectedTool === 'select' && selectedElements.includes(group.id) && (
                <div className="hidden" />
              )}
              <svg className="absolute inset-0 pointer-events-none" style={{ width: group.width, height: group.height }}>
                {group.elements.filter(el => el.type === 'draw' || el.type === 'line').map(el => (
                  <path
                    key={el.id}
                    d={renderPath(el.path.map(p => ({ x: p.x - group.x, y: p.y - group.y })))}
                    stroke={el.color}
                    strokeWidth={el.width}
                    fill="none"
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                  />
                ))}
              </svg>
              {group.elements.filter(el => el.type !== 'draw' && el.type !== 'line').map(el => (
                <div
                  key={el.id}
                  className="absolute"
                  style={{
                    left: el.x - group.x,
                    top: el.y - group.y,
                    pointerEvents: 'none'
                  }}
                >
                  {el.type === 'text' && (
                    <div
                      className="px-3 py-2 bg-black border border-white text-white whitespace-pre-wrap"
                      style={{ 
                        fontSize: el.fontSize || 14,
                      }}
                      dangerouslySetInnerHTML={{ __html: el.content || 'Empty text' }}
                    />
                  )}
                  {el.type === 'image' && (
                    <div className="relative">
                      {el.filename && (
                        <div 
                          className="absolute text-white font-mono truncate"
                          style={{ 
                            top: '-14px',
                            left: 0,
                            fontSize: '8px',
                            maxWidth: el.width,
                            opacity: 0.7
                          }}
                        >
                          {el.filename}
                        </div>
                      )}
                      <img
                        src={el.src}
                        alt="Board element"
                        style={{ 
                          width: el.width, 
                          height: el.height, 
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          
          {visibleElements.elements.filter(el => el.type !== 'draw' && el.type !== 'line').map(el => (
            <div
              key={el.id}
              className={`absolute ${selectedElements.includes(el.id) ? 'ring-2 ring-white' : ''}`}
              style={{
                left: el.x,
                top: el.y,
                cursor: selectedTool === 'select' ? 'move' : 'default',
                pointerEvents: 'auto'
              }}
              onMouseDown={(e) => handleElementMouseDown(e, el.id)}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => handleDoubleClick(e, el.id)}
              onDragStart={(e) => e.preventDefault()}
              onContextMenu={(e) => handleElementContextMenu(e, el.id)}
            >
              {/* Comment indicator */}
              {collaborationMode && comments[el.id] && comments[el.id].length > 0 && (
                <div
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs cursor-pointer z-10"
                  style={{
                    backgroundColor: userColors[comments[el.id][0]?.user_id] || '#FFFFFF',
                    color: '#000000'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCommentElement(el.id);
                  }}
                  title={`${comments[el.id].length} comment(s)`}
                >
                  {comments[el.id].length}
                </div>
              )}
              {el.type === 'text' && (
                <>
                  {editingText === el.id ? (
                    <div className="relative">
                      <div
                        ref={textInputRef}
                        contentEditable
                        suppressContentEditableWarning
                        onKeyDown={(e) => {
                          // Handle Ctrl+B for bold
                          if (e.ctrlKey && e.key === 'b') {
                            e.preventDefault();
                            document.execCommand('bold', false, null);
                          }
                          // Handle Ctrl+I for italic
                          if (e.ctrlKey && e.key === 'i') {
                            e.preventDefault();
                            document.execCommand('italic', false, null);
                          }
                          // Handle Enter to finish editing
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            const content = e.target.innerHTML;
                            setElements(elements.map(element =>
                              element.id === el.id ? { ...element, content } : element
                            ));
                            setEditingText(null);
                            setSelectedTool('select');
                            setJustFinishedTextEdit(true);
                            setTimeout(() => setJustFinishedTextEdit(false), 100);
                            setTimeout(() => saveToHistory(), 50);
                          }
                          // Handle Escape to finish editing
                          if (e.key === 'Escape') {
                            const content = e.target.innerHTML;
                            setElements(elements.map(element =>
                              element.id === el.id ? { ...element, content } : element
                            ));
                            setEditingText(null);
                            setSelectedTool('select');
                            setJustFinishedTextEdit(true);
                            setTimeout(() => setJustFinishedTextEdit(false), 100);
                            setTimeout(() => saveToHistory(), 50);
                          }
                        }}
                        onBlur={(e) => {
                          const content = e.target.innerHTML;
                          setElements(elements.map(element =>
                            element.id === el.id ? { ...element, content } : element
                          ));
                          setEditingText(null);
                          setSelectedTool('select');
                          setJustFinishedTextEdit(true);
                          setTimeout(() => setJustFinishedTextEdit(false), 100);
                          setTimeout(() => saveToHistory(), 50);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="px-3 py-2 bg-black text-white outline-none overflow-hidden"
                        style={{ 
                          fontSize: 14, 
                          width: el.width || 200,
                          minHeight: el.height || 40,
                          wordWrap: 'break-word',
                          whiteSpace: 'pre-wrap',
                          border: '0.5px solid rgba(255, 255, 255, 0.5)',
                        }}
                        dangerouslySetInnerHTML={{ __html: el.content || '' }}
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <div
                        className="px-3 py-2 bg-black text-white overflow-hidden"
                        style={{ 
                          fontSize: 14,
                          width: el.width || 200,
                          minHeight: el.height || 40,
                          wordWrap: 'break-word',
                          whiteSpace: 'pre-wrap',
                          border: '0.5px solid rgba(255, 255, 255, 0.5)',
                        }}
                        dangerouslySetInnerHTML={{ __html: el.content || 'Empty text' }}
                      />
                      {selectedElements.includes(el.id) && selectedTool === 'select' && (
                        <div
                          className="absolute bottom-0 right-0 bg-white cursor-se-resize"
                          style={{ 
                            width: '6px',
                            height: '6px',
                            transform: 'translate(50%, 50%)'
                          }}
                          onMouseDown={(e) => handleResizeMouseDown(e, el.id)}
                        />
                      )}
                    </div>
                  )}
                </>
              )}
              {el.type === 'image' && (
                <div className="relative">
                  {el.filename && (
                    <div 
                      className="absolute text-white font-mono truncate"
                      style={{ 
                        top: '-14px',
                        left: 0,
                        fontSize: '8px',
                        maxWidth: el.width,
                        opacity: 0.7
                      }}
                    >
                      {el.filename}
                    </div>
                  )}
                  <img
                    src={el.src}
                    alt="Board element"
                    style={{ 
                      width: el.width, 
                      height: el.height, 
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                  {selectedElements.includes(el.id) && selectedTool === 'select' && (
                    <div
                      className="absolute bottom-0 right-0 bg-white cursor-se-resize"
                      style={{ 
                        width: '6px',
                        height: '6px',
                        transform: 'translate(50%, 50%)'
                      }}
                      onMouseDown={(e) => handleResizeMouseDown(e, el.id)}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

          {/* Remote Cursors - rendered inside the scaled canvas area */}
          {collaborationMode && Object.entries(remoteCursors).map(([username, cursor]) => (
            <div
              key={username}
              className="absolute pointer-events-none z-50"
              style={{
                left: cursor.x * zoom,
                top: cursor.y * zoom,
                transform: 'translate(-2px, -2px)',
                transition: 'left 0.03s linear, top 0.03s linear'
              }}
            >
              {/* Cursor arrow */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill={cursor.color || userColors[username] || '#FFFFFF'}
                style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))' }}
              >
                <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36z" />
              </svg>
              {/* Username label */}
              <div
                className="absolute left-5 top-4 px-1 py-0.5 text-xs font-mono whitespace-nowrap"
                style={{
                  backgroundColor: cursor.color || userColors[username] || '#FFFFFF',
                  color: '#000000',
                  borderRadius: '2px',
                  fontSize: '10px'
                }}
              >
                {username}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Panel - Fixed on right side */}
      {collaborationMode && (
        <div
          className={`fixed right-0 top-0 h-full bg-black border-l border-white flex flex-col z-40 transition-transform ${
            chatOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ width: '300px' }}
        >
          {/* Chat Header */}
          <div className="p-3 border-b border-white flex items-center justify-between">
            <span className="text-white text-sm font-mono">CHAT</span>
            <div className="flex items-center gap-2">
              {/* Online users indicator */}
              <div className="flex items-center gap-1">
                {remoteUsers.map(user => (
                  <div
                    key={user}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: userColors[user] || '#FFFFFF' }}
                    title={user}
                  />
                ))}
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-white hover:text-gray-400 text-xs"
              >
                X
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.map((msg, i) => (
              <div key={msg.id || i} className="text-xs font-mono">
                <div className="flex items-center gap-1">
                  <span
                    style={{ color: userColors[msg.user_id] || '#FFFFFF' }}
                  >
                    {msg.username || msg.user_id}
                  </span>
                  <span className="text-gray-500 text-[10px]">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-white pl-2">{msg.content}</div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 bg-black border border-white text-white text-xs p-2 font-mono focus:outline-none"
              />
              <button
                onClick={sendChatMessage}
                className="px-3 py-1 bg-white text-black text-xs font-mono hover:bg-gray-200"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Toggle Button - when chat is closed */}
      {collaborationMode && !chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed right-4 bottom-4 px-3 py-2 bg-black border border-white text-white text-xs font-mono hover:bg-white hover:text-black z-40"
        >
          Chat {chatMessages.length > 0 && `(${chatMessages.length})`}
        </button>
      )}

      {/* Context Menu for adding comments */}
      {contextMenu && (
        <div
          className="fixed bg-black border border-white z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="block w-full px-4 py-2 text-white text-xs font-mono hover:bg-white hover:text-black text-left"
            onClick={() => {
              setActiveCommentElement(contextMenu.elementId);
              setContextMenu(null);
            }}
          >
            Add Comment
          </button>
        </div>
      )}

      {/* Comment Panel for active element */}
      {activeCommentElement && (
        <div
          className="fixed bg-black border border-white z-50 p-3"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '320px',
            maxHeight: '400px'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-white text-sm font-mono">COMMENTS</span>
            <button
              onClick={() => {
                setActiveCommentElement(null);
                setCommentInput('');
              }}
              className="text-white hover:text-gray-400 text-xs"
            >
              X
            </button>
          </div>

          {/* Existing comments */}
          <div className="max-h-48 overflow-y-auto mb-3 space-y-2">
            {(comments[activeCommentElement] || []).map((comment, i) => (
              <div key={comment.id || i} className="text-xs font-mono border-b border-gray-700 pb-2">
                <div className="flex items-center gap-1">
                  <span style={{ color: userColors[comment.user_id] || '#FFFFFF' }}>
                    {comment.username || comment.user_id}
                  </span>
                  <span className="text-gray-500 text-[10px]">
                    {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-white pl-2">{comment.content}</div>
              </div>
            ))}
            {(!comments[activeCommentElement] || comments[activeCommentElement].length === 0) && (
              <div className="text-gray-500 text-xs">No comments yet</div>
            )}
          </div>

          {/* Add comment input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  addComment(activeCommentElement, commentInput);
                }
              }}
              placeholder="Add a comment..."
              className="flex-1 bg-black border border-white text-white text-xs p-2 font-mono focus:outline-none"
              autoFocus
            />
            <button
              onClick={() => addComment(activeCommentElement, commentInput)}
              className="px-3 py-1 bg-white text-black text-xs font-mono hover:bg-gray-200"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          onClick={() => setShowHelp(false)}
        >
          <div 
            className="bg-black border-2 border-white p-6 w-full max-w-5xl h-[90vh] overflow-y-auto"
            style={{ fontFamily: 'Courier New, monospace' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-center mt-12 mb-12 mx-16">
              <div className="w-full h-64 overflow-visible flex items-center justify-center">
                <pre 
                  className="text-white font-mono text-center whitespace-pre opacity-100"
                  style={{ 
                    fontSize: '10px', 
                    lineHeight: '10px',
                    transform: 'scale(0.57)',
                    transformOrigin: 'center center'
                  }}
                >
{`              ***************************************************************************************************             
            ********************************************************************************************************          
          ****                                                                                                    ****        
         ***                                            ************                                               ****       
        ***                                          *****        ******                                            ****      
        **                                        ***** ************ ****                                            ***      
        **                            *****      **** **************** ****      *****                               ***      
        **                            ********  *** ******************** ***  ********                               ***      
        **                            **    ****** **********************  *****    **                               ***      
        **                            ** ***  *** ************************ **** **  **                               ***      
        **                            **  ****  * ************************   *****  **                               ***      
        **                            **   *****  ****   **** * ***     **  ****    **                               ***      
        **                             ** **  ** ******             ******  *** **  **                               ***      
        **                             ** ***  ********     ****      ****  *  *** **                                ***      
        **                              ** ***  *********** ****  ***********  *** **                                ***      
        **                              ** ***  ********* ********  ********* *** **                                 ***      
        **                         ******** ***  * *****  ********* ************ ******                              ***      
        **                  *******           ***   *** ****  *  *** ***   ****        *******                       ***      
        **                ****                    **** ******   *********                   *****                    ***      
        **             ****                      ********    ***    ******                      ****                 ***      
        **            ***                        ******  *********** *****                         ****              ***      
        **          ***                           ***** ******************                           **              ***      
        **          **                             *******   ***   *******                            ****           ***      
        **         **        *******                ********************                      *****    ****          ***      
        **       ****          **********************   *************      **********************        ***         ***      
        **      ****            ************************             **************************           ***        ***      
        **      ***              *************************************************************             ***       ***      
        **    ***                ******************************************** ********** *****              ***      ***      
        **   ***                    ****************         **************** ********** ****                ***     ***      
        **   **   *****  ***********  ************* ************************* ********** *** *****   *******   **    ***      
        **  **   **      *********** *  ************ ************************ **********   **********     ***   **   ***      
        **  **         ********      *  ******** ***********************  *** ** * * ***  ***** ******           **  ***      
        **  *          ************  *  ******** ********* ***********************  **** ****  ********           ** ***      
        ** **           ****  ***** *** ***** ** ********************************   *****    ***** *****          ******      
        ** **          **********   *  ****** ******  ****************************  ******  **** *******          ******      
        **  **          ********** ********** *****   *************************************    *****  ***         ** ***      
        **  **          ******    *********** ********************         *******  ********  ****  *****         ** ***      
        **   **         ********************* ******************* ******* ******************     *****           **  ***      
        **    ***             * ********** *  ****************** ***************************     ***           ***   ***      
        **     *****           ****  **************        ********** **********************                 ****    ***      
        **        ******      ******** ****   *** ******* *********** ********         *****             ******      ***      
        **           **************************  ******* ************ **************** *****  **************         ***      
        **               *** *******************  ***** ************* **************** ****** ***                    ***      
        **              *** ***************************************** **************** ****** ***                    ***      
        **             *** ****************************************************       ******* ***                    ***      
        ***************** ******            ********************    *************************  *************************      
        ****************                                              **********************   *************************      
                                                                                                                              
            *********     ***********       ****       ******   ***        *****   ****   ************ ***************        
            ****   ****    ****    **      ******       ******   **         *****   ***    ****     ** ***  ***** ****        
            ****   *****   ****            ******       ******   **         ******  ***    ****        **   *****  ***        
            ****    ****   ****           ********      ******** **         ******* ***    ****             *****             
            ****    *****  *********      *** ****      ** ***** **         ***********    **********       *****             
            ****    *****  ***** ***     ***  *****     **  *******         ** ********    ***** ****       *****             
            ****    ****   ****          **********     **   ******         **  *******    ****             *****             
            ****   *****   ****      *  ************    **    *****         **   ******    ****       *     *****             
            ****  *****   *****    ***  ***     *****   **     ****  ****   **    *****    *****    ***     *****             
          ***********    ************* *****  ******** *****    *** ***** ******   ****  **************   ********            
                                                                                                                              
         ***                                                                                                        **        
         ****                                                                                                     *****       
           *****                                                                                                *****         
             ******************************************************************************************************           `}
                </pre>
              </div>
            </div>
            
            <div className="text-white text-sm">
              <div className="text-center mb-4">
                <p className="text-base font-bold">INFINITE CANVAS PLANNING BOARD</p>
                <p className="text-xs opacity-75">Press P to toggle • Click outside to close</p>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="font-bold mb-1 text-xs border-b border-white pb-1">TOOLS</p>
                  <div className="space-y-0.5 text-xs">
                    <p>S - Select</p>
                    <p>T - Text</p>
                    <p>I - Image</p>
                    <p>D - Draw</p>
                    <p>L - Line</p>
                    <p>E - Erase</p>
                    <p>K - Scale</p>
                  </div>
                </div>

                <div>
                  <p className="font-bold mb-1 text-xs border-b border-white pb-1">NAVIGATE</p>
                  <div className="space-y-0.5 text-xs">
                    <p>Space+Drag - Pan</p>
                    <p>Scroll - Zoom</p>
                    <p>F - Fit all</p>
                    <p>+/- - Zoom</p>
                  </div>
                </div>

                <div>
                  <p className="font-bold mb-1 text-xs border-b border-white pb-1">SELECT</p>
                  <div className="space-y-0.5 text-xs">
                    <p>Click - Single</p>
                    <p>Shift+Click - Add</p>
                    <p>Drag Box - Multi</p>
                    <p>Ctrl+A - All</p>
                    <p>2x Click - Reset</p>
                  </div>
                </div>

                <div>
                  <p className="font-bold mb-1 text-xs border-b border-white pb-1">EDIT</p>
                  <div className="space-y-0.5 text-xs">
                    <p>Ctrl+C - Copy</p>
                    <p>Ctrl+V - Paste</p>
                    <p>Ctrl+Z - Undo</p>
                    <p>Ctrl+Shift+Z - Redo</p>
                    <p>Del - Remove</p>
                    <p>Ctrl+G - Group</p>
                    <p>Ctrl+Shift+G - Ungroup</p>
                  </div>
                </div>

                <div>
                  <p className="font-bold mb-1 text-xs border-b border-white pb-1">TEXT</p>
                  <div className="space-y-0.5 text-xs">
                    <p>Ctrl+B - Bold</p>
                    <p>Ctrl+I - Italic</p>
                    <p>Esc - Finish editing</p>
                  </div>
                </div>
              </div>

              <div className="border border-white p-3 text-xs">
                <p className="font-bold mb-1">QUICK TIPS</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <p>• Auto-saves every 3 seconds</p>
                  <p>• Scale (K) grows from center</p>
                  <p>• Groups organize layouts</p>
                  <p>• Double-click canvas returns to Select</p>
                </div>
              </div>

              <div className="text-center mt-4">
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-8 py-2 bg-white text-black hover:bg-black hover:text-white border-2 border-white transition-colors text-sm font-bold"
                >
                  START PLANNING
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
