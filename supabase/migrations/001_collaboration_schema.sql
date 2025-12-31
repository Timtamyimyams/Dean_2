-- Supabase Real-time Collaboration Schema for DEAN Planning Board
-- Phase 1: Core tables for boards, presence, messages, and comments
-- Created: 2025-12-30

-- ============================================================================
-- TABLE: boards
-- Purpose: Store board state including elements, groups, and viewport
-- ============================================================================
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Untitled Board',
  elements JSONB DEFAULT '[]'::jsonb,
  groups JSONB DEFAULT '[]'::jsonb,
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for boards table
CREATE INDEX IF NOT EXISTS idx_boards_created_by ON boards(created_by);
CREATE INDEX IF NOT EXISTS idx_boards_updated_at ON boards(updated_at DESC);

-- ============================================================================
-- TABLE: presence
-- Purpose: Track active users and their cursor positions on a board
-- Ensures only one presence record per user per board (UNIQUE constraint)
-- ============================================================================
CREATE TABLE IF NOT EXISTS presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  cursor_x FLOAT,
  cursor_y FLOAT,
  color TEXT DEFAULT '#3B82F6',
  last_seen TIMESTAMPTZ DEFAULT now(),
  UNIQUE(board_id, user_id)
);

-- Create indexes for presence table
CREATE INDEX IF NOT EXISTS idx_presence_board_id ON presence(board_id);
CREATE INDEX IF NOT EXISTS idx_presence_user_id ON presence(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence(last_seen DESC);

-- ============================================================================
-- TABLE: messages
-- Purpose: Store chat messages for collaboration communication
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_board_id ON messages(board_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ============================================================================
-- TABLE: comments
-- Purpose: Store element-level comments for collaborative feedback
-- ============================================================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  element_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for comments table
CREATE INDEX IF NOT EXISTS idx_comments_board_id ON comments(board_id);
CREATE INDEX IF NOT EXISTS idx_comments_element_id ON comments(element_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_resolved ON comments(resolved);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- MVP: Allow all authenticated users to read and write to all tables
-- Note: These policies should be replaced with proper role-based access control
--       in production after authentication is fully implemented
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BOARDS TABLE RLS POLICIES
-- ============================================================================
-- MVP: Allow all users to read all boards
CREATE POLICY "Allow all users to read boards" ON boards
  FOR SELECT
  USING (true);

-- MVP: Allow all users to create boards
CREATE POLICY "Allow all users to create boards" ON boards
  FOR INSERT
  WITH CHECK (true);

-- MVP: Allow all users to update all boards
CREATE POLICY "Allow all users to update boards" ON boards
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- MVP: Allow all users to delete boards
CREATE POLICY "Allow all users to delete boards" ON boards
  FOR DELETE
  USING (true);

-- ============================================================================
-- PRESENCE TABLE RLS POLICIES
-- ============================================================================
-- MVP: Allow all users to read presence data
CREATE POLICY "Allow all users to read presence" ON presence
  FOR SELECT
  USING (true);

-- MVP: Allow all users to insert presence records
CREATE POLICY "Allow all users to insert presence" ON presence
  FOR INSERT
  WITH CHECK (true);

-- MVP: Allow all users to update presence records
CREATE POLICY "Allow all users to update presence" ON presence
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- MVP: Allow all users to delete presence records
CREATE POLICY "Allow all users to delete presence" ON presence
  FOR DELETE
  USING (true);

-- ============================================================================
-- MESSAGES TABLE RLS POLICIES
-- ============================================================================
-- MVP: Allow all users to read messages
CREATE POLICY "Allow all users to read messages" ON messages
  FOR SELECT
  USING (true);

-- MVP: Allow all users to insert messages
CREATE POLICY "Allow all users to insert messages" ON messages
  FOR INSERT
  WITH CHECK (true);

-- MVP: Allow all users to update messages
CREATE POLICY "Allow all users to update messages" ON messages
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- MVP: Allow all users to delete messages
CREATE POLICY "Allow all users to delete messages" ON messages
  FOR DELETE
  USING (true);

-- ============================================================================
-- COMMENTS TABLE RLS POLICIES
-- ============================================================================
-- MVP: Allow all users to read comments
CREATE POLICY "Allow all users to read comments" ON comments
  FOR SELECT
  USING (true);

-- MVP: Allow all users to insert comments
CREATE POLICY "Allow all users to insert comments" ON comments
  FOR INSERT
  WITH CHECK (true);

-- MVP: Allow all users to update comments
CREATE POLICY "Allow all users to update comments" ON comments
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- MVP: Allow all users to delete comments
CREATE POLICY "Allow all users to delete comments" ON comments
  FOR DELETE
  USING (true);

-- ============================================================================
-- REALTIME PUBLICATION SETUP
-- Purpose: Enable real-time subscriptions for all tables
-- ============================================================================
-- Drop existing publications if they exist (idempotent)
DROP PUBLICATION IF EXISTS "realtime" CASCADE;

-- Create realtime publication for all tables
CREATE PUBLICATION "realtime" FOR TABLE boards, presence, messages, comments;

-- ============================================================================
-- ADDITIONAL CONFIGURATION
-- ============================================================================
-- Note: The following should be enabled in Supabase dashboard if not already:
-- 1. Enable Realtime in Replication tab for this publication
-- 2. Configure authentication strategy (JWT or Service Role)
-- 3. Set up proper RLS policies for production
-- 4. Consider adding triggers for updated_at timestamp updates on boards
