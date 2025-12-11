import React, { useState, useRef, useEffect } from 'react';
import { Type, Image, Minus, Move, Pencil, Trash2, Eraser, Maximize2, LogOut } from 'lucide-react';

export default function ProjectPlanningBoard() {
  // Supabase configuration
  const SUPABASE_URL = 'https://wdxeucdxzwerqkdicwgq.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkeGV1Y2R4endlcnFrZGljd2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Njc0ODUsImV4cCI6MjA4MTA0MzQ4NX0.0KpU4ehry7mSo5DkMz6iL-N34XxlNmz8-X-m16Gz308';
  
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
  const [showHelp, setShowHelp] = useState(true); // Show on first load
  const [collaborationMode, setCollaborationMode] = useState(false);
  const [collaborationBoardId, setCollaborationBoardId] = useState(null);
  const [lastRemoteUpdate, setLastRemoteUpdate] = useState(0);
  const [remoteUsers, setRemoteUsers] = useState([]);

  // Tool Definitions - Centralized tool logic
  const toolDefinitions = {
    select: {
      id: 'select',
      icon: Move,
      label: 'Select/Move',
      hotkey: 'S',
      cursor: 'default',
      
      onMouseDown: ({ x, y, target }, context) => {
        context.setIsSelecting(true);
        context.setSelectionStart({ x, y });
        context.setSelectionBox({ x, y, width: 0, height: 0 });
        // Only clear selection if NOT holding shift
        if (!target.shiftKey) {
          context.setSelectedElements([]);
        }
      },
    },
    
    scale: {
      id: 'scale',
      icon: Maximize2,
      label: 'Scale',
      hotkey: 'K',
      cursor: 'zoom-in',
      
      onMouseDown: ({ x, y }, context) => {
        if (context.selectedElements.length === 0) return;
        context.setIsScaling(true);
        context.setScaleStart({ x, y });
      },
    },
    
    text: {
      id: 'text',
      icon: Type,
      label: 'Text',
      hotkey: 'T',
      cursor: 'text',
      autoSwitchToSelect: true,
      
      onCanvasClick: ({ x, y }, context) => {
        const newElement = {
          id: Date.now(),
          type: 'text',
          x,
          y,
          content: '',
          fontSize: 14,
          width: 200,
          height: 40,
        };
        context.setElements([...context.elements, newElement]);
        context.setEditingText(newElement.id);
        context.setTextInput('');
      },
    },
    
    image: {
      id: 'image',
      icon: Image,
      label: 'Image',
      hotkey: 'I',
      cursor: 'copy',
      autoSwitchToSelect: true,
      
      onCanvasClick: ({ x, y }, context) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const newElement = {
                id: Date.now(),
                type: 'image',
                x,
                y,
                src: event.target.result,
                width: 200,
                height: 200,
                filename: file.name
              };
              context.setElements(prev => [...prev, newElement]);
              setTimeout(() => context.saveToHistory(), 50);
              context.setSelectedTool('select');
            };
            reader.readAsDataURL(file);
          } else {
            context.setSelectedTool('select');
          }
        };
        input.click();
      },
    },
    
    draw: {
      id: 'draw',
      icon: Pencil,
      label: 'Draw',
      hotkey: 'D',
      cursor: 'crosshair',
      
      onMouseDown: ({ x, y }, context) => {
        context.setIsDrawing(true);
        context.setCurrentPath([{ x, y }]);
      },
      
      onMouseMove: ({ x, y }, context) => {
        if (context.isDrawing) {
          context.setCurrentPath([...context.currentPath, { x, y }]);
        }
      },
      
      onMouseUp: (coords, context) => {
        if (context.isDrawing && context.currentPath.length > 0) {
          const newElement = {
            id: Date.now(),
            type: 'draw',
            path: context.currentPath,
            color: '#ffffff',
            width: 2
          };
          context.setElements([...context.elements, newElement]);
          context.setCurrentPath([]);
        }
      },
    },
    
    line: {
      id: 'line',
      icon: Minus,
      label: 'Line',
      hotkey: 'L',
      cursor: 'crosshair',
      
      onMouseDown: ({ x, y }, context) => {
        context.setIsDrawing(true);
        context.setCurrentPath([{ x, y }]);
      },
      
      onMouseMove: ({ x, y }, context) => {
        if (context.isDrawing && context.currentPath.length > 0) {
          context.setCurrentPath([context.currentPath[0], { x, y }]);
        }
      },
      
      onMouseUp: (coords, context) => {
        if (context.isDrawing && context.currentPath.length > 0) {
          const newElement = {
            id: Date.now(),
            type: 'line',
            path: context.currentPath,
            color: '#ffffff',
            width: 2
          };
          context.setElements([...context.elements, newElement]);
          context.setCurrentPath([]);
        }
      },
    },
    
    erase: {
      id: 'erase',
      icon: Eraser,
      label: 'Erase',
      hotkey: 'E',
      cursor: 'not-allowed',
      
      onMouseDown: ({ x, y }, context) => {
        context.setIsErasing(true);
        context.setEraseStart({ x, y });
        context.setEraseBox({ x, y, width: 0, height: 0 });
      },
    },
  };

  const tools = Object.values(toolDefinitions);

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
    const supabase = getSupabaseClient();
    if (!supabase) {
      alert('Supabase not available. Make sure the script is loaded.');
      return;
    }
    
    const boardId = window.prompt('Enter board ID to collaborate on:', 'board-' + Date.now());
    if (!boardId) return;
    
    setCollaborationMode(true);
    setCollaborationBoardId(boardId);
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel(`board:${boardId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'boards', filter: `id=eq.${boardId}` },
        (payload) => {
          if (payload.new && payload.new.data) {
            const boardData = payload.new.data;
            setElements(boardData.elements || []);
            setGroups(boardData.groups || []);
            setZoom(boardData.zoom || 1);
          }
        }
      )
      .subscribe();
    
    // Load initial data
    const { data } = await supabase
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .single();
    
    if (data && data.data) {
      setElements(data.data.elements || []);
      setGroups(data.data.groups || []);
      setZoom(data.data.zoom || 1);
    }
    
    alert(`Collaboration enabled! Share this ID: ${boardId}\n\nAnyone with this link can join in real-time.`);
  };

  // Supabase: Save to shared board
  const saveToSharedBoard = async () => {
    if (!collaborationMode || !collaborationBoardId) return;
    
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
      const boardData = {
        elements,
        groups,
        zoom
      };
      
      await supabase
        .from('boards')
        .upsert({
          id: collaborationBoardId,
          data: boardData,
          updated_at: new Date().toISOString()
        });
    } catch (err) {
      console.error('Error saving to Supabase:', err);
    }
  };

  // Collaboration: Auto-save changes to Supabase
  useEffect(() => {
    if (!collaborationMode) return;
    
    const saveTimeout = setTimeout(() => {
      saveToSharedBoard();
    }, 1000); // Debounce saves
    
    return () => clearTimeout(saveTimeout);
  }, [elements, groups, collaborationMode]);

  // Initialize Supabase client
  const getSupabase = () => {
    if (typeof window === 'undefined') return null;
    if (!window.supabaseClient) {
      // Dynamic import of Supabase
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      document.head.appendChild(script);
    }
    if (window.supabase) {
      if (!window.supabaseClient) {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }
      return window.supabaseClient;
    }
    return null;
  };

  // Auto-save to Supabase
  const saveToCloud = async () => {
    if (!currentUser) return;
    
    try {
      const supabase = getSupabase();
      if (!supabase) {
        console.log('Supabase not loaded yet');
        return;
      }
      
      const boardData = {
        name: currentBoardName,
        elements,
        groups,
        zoom,
        savedAt: new Date().toISOString()
      };
      
      const boardId = `${currentUser.username}-${currentBoardName}`;
      
      const { error } = await supabase
        .from('boards')
        .upsert({
          id: boardId,
          user_id: currentUser.username,
          data: boardData,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      setLastSaved(new Date());
    } catch (err) {
      console.error('Error saving to Supabase:', err);
    }
  };

  // Load from Supabase
  const loadFromCloud = async (boardName) => {
    if (!currentUser) return;
    
    try {
      const supabase = getSupabase();
      if (!supabase) {
        alert('Database not connected yet. Please wait a moment.');
        return;
      }
      
      const boardId = `${currentUser.username}-${boardName}`;
      
      const { data, error } = await supabase
        .from('boards')
        .select('data')
        .eq('id', boardId)
        .single();
      
      if (error) throw error;
      
      if (data && data.data) {
        const boardData = data.data;
        setElements(boardData.elements || []);
        setGroups(boardData.groups || []);
        setZoom(boardData.zoom || 1);
        setCurrentBoardName(boardName);
        setLastSaved(new Date(boardData.savedAt));
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
      const supabase = getSupabase();
      if (!supabase) {
        alert('Database not connected yet. Please wait a moment.');
        return;
      }
      
      const { data, error } = await supabase
        .from('boards')
        .select('id, data')
        .eq('user_id', currentUser.username);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const boardNames = data.map(b => b.data.name || b.id);
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

  // Auto-save effect
  useEffect(() => {
    const autoSave = setTimeout(() => {
      if ((elements.length > 0 || groups.length > 0) && currentUser) {
        // Save to Supabase
        saveToCloud();
        // Also save to IndexedDB as backup
        saveToIndexedDB();
      }
    }, 3000);

    return () => clearTimeout(autoSave);
  }, [elements, groups, currentUser]);

  // Load from Supabase on login
  useEffect(() => {
    if (!currentUser) return;
    
    const loadData = async () => {
      // Wait for Supabase to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if user wants to start fresh
      const urlParams = new URLSearchParams(window.location.search);
      const startFresh = urlParams.get('fresh') === 'true';
      
      if (startFresh) {
        console.log('Starting with fresh board');
        return;
      }
      
      // Try Supabase first
      try {
        const supabase = getSupabase();
        if (supabase) {
          const boardId = `${currentUser.username}-${currentBoardName}`;
          const { data, error } = await supabase
            .from('boards')
            .select('data')
            .eq('id', boardId)
            .single();
          
          if (data && data.data) {
            const boardData = data.data;
            setElements(boardData.elements || []);
            setGroups(boardData.groups || []);
            setZoom(boardData.zoom || 1);
            setLastSaved(new Date(boardData.savedAt));
            console.log('Loaded from Supabase');
            return;
          }
        }
      } catch (err) {
        console.log('No Supabase data found, trying IndexedDB...');
      }
      
      // Fallback to IndexedDB
      try {
        const db = await openDB();
        const tx = db.transaction('boards', 'readonly');
        const boardData = await tx.objectStore('boards').get(currentBoardName);
        
        if (boardData) {
          setElements(boardData.elements || []);
          setGroups(boardData.groups || []);
          setZoom(boardData.zoom || 1);
          setLastSaved(new Date(boardData.savedAt));
          console.log('Loaded from IndexedDB');
        }
      } catch (err) {
        console.log('No saved data in IndexedDB');
      }
    };
    
    // Load Supabase script first
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => loadData();
    document.head.appendChild(script);
  }, [currentUser]);

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
    
    const { x, y } = getWorldCoords(e);

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
    }
  };

  const deleteElements = () => {
    if (selectedElements.length > 0) {
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
          
          {false && ( // Hidden for now
          <button
            onClick={enableCollaboration}
            className={`px-2 py-1 text-xs border ml-3 ${
              collaborationMode 
                ? 'bg-white text-black border-white' 
                : 'bg-black text-white border-white hover:bg-white hover:text-black'
            }`}
            title="Enable real-time collaboration"
          >
            {collaborationMode ? '🟢 Live' : 'Collaborate'}
          </button>
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
            >
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
                          // Handle Escape to finish editing
                          if (e.key === 'Escape') {
                            const content = e.target.innerHTML;
                            setElements(elements.map(element =>
                              element.id === el.id ? { ...element, content } : element
                            ));
                            setEditingText(null);
                            setTimeout(() => saveToHistory(), 50);
                          }
                        }}
                        onBlur={(e) => {
                          const content = e.target.innerHTML;
                          setElements(elements.map(element =>
                            element.id === el.id ? { ...element, content } : element
                          ));
                          setEditingText(null);
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
        </div>
      </div>

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
