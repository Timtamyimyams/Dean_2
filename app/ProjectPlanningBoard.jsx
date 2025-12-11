import React, { useState, useRef, useEffect } from 'react';
import { Type, Image, Minus, Move, Pencil, Trash2, Eraser, Maximize2, LogOut } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

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
